'use strict';

const Alexa = require('alexa-sdk'),
	AWS = require('aws-sdk'),
	https = require('https');

AWS.config.update({ region: 'us-east-1' });

const APP_ID = process.env.APP_ID,
	COVEO_KEY = process.env.COVEO_KEY,
	TEST_EMAIL_ADDR = process.env.TEST_EMAIL_ADDR;

const languageStrings = {
	'en': {
		translation: {
			HELP_MESSAGE: 'You can say ask coveo about X, or, you can say exit... What can I help you with?',
			HELP_REPROMPT: 'What can I help you with?',
			STOP_MESSAGE: 'Goodbye!'
		}
	}
};

let getCoveoUrl = function (query) {
	let searchUrl = process.env.COVEO_URL || 'https://platform.cloud.coveo.com/rest/search/v2',
		pipeline = process.env.COVEO_PIPELINE || '';

	if (pipeline) {
		pipeline = '&pipeline=' + pipeline;
	}

	return `${searchUrl}?q=${encodeURIComponent(query)}${pipeline}&access_token=${COVEO_KEY}&groupBy=${encodeURIComponent('[{"field":"@source"}]')}`;
};


/**
 * Function to send an email with the top results
*/
let sendSESMail = function (queryTerms, results) {
	let ses = new AWS.SES(),
		introText = `<h3><p>Here are the top results for your recent query: ${queryTerms}</p></h3>`;

	let emailBodyArr = [];
	for (let i = 0; i < (results || []).length; i++) {
		let raw = results[i].raw || {};
		emailBodyArr.push(`<p>
			<b>Title: </b>${raw.systitle}<br>
			<b>URL: </b> <a href="${raw.sysuri}">link to document</a><br>
			<b>Source: </b>${raw.source}<br></p>`);
	}
	let emailBody = introText + emailBodyArr.join('\n');

	var params = {
		Destination: {
			ToAddresses: [TEST_EMAIL_ADDR]
		},
		Message: {
			Body: {
				Html: {
					Data: emailBody,
					Charset: 'UTF-8'
				}
			},
			Subject: {
				Data: 'Your query to Coveo with Alexa: ' + queryTerms,
				Charset: 'UTF-8'
			}
		},
		Source: TEST_EMAIL_ADDR,
		ReplyToAddresses: [TEST_EMAIL_ADDR]
	};

	try {
		//send the email
		ses.sendEmail(params, function (err, data) {
			if (err) {
				console.log(err, err.stack);
				// context.fail("There was an error... we dont know why");
			}
			else {
				console.log(data); //success
				// context.succeed('The email was successfully sent');
			}
		});

	} catch (e) {
		console.log('CATCH: ', e);
	}
};

// find the categories from the response's groupByResults.
let getCategories = function (response, categoryName) {
	let categories = [], groupByResults = response.groupByResults;
	for (let g = 0; g < groupByResults.length; g++) {
		let groupBy = groupByResults[g];
		if (groupBy.field == categoryName) {
			for (let v = 0; v < groupBy.values.length; v++) {
				categories.push(groupBy.values[v].value);
			}
		}
	}
	return categories;
};

const handlers = {
	'LaunchRequest': function () {
		let welcome = 'Welcome to Coveo Query.',
			reprompt = 'Please repeat';
		this.emit(':ask', welcome, reprompt);
	},
	'CoveoSearchIntent': function () {
		try {
			let query = this.event.request.intent.slots.query.value,
				url = getCoveoUrl(query);

			console.log('QUERY: ', query);
			console.log('URL: ', url);

			https.get(url, (res) => {
				let body = '';

				res.on('data', (data) => {
					body += data;
				});

				res.on('end', () => {
					let response = JSON.parse(body),
						totalCount = response.totalCount,
						len = response.results.length,
						topResult = len ? response.results[0] : { raw: {} };

					if (len < 1) {
						this.emit(':tell', 'Sorry, we found no result.');
						return;
					}

					let categories = getCategories(response, 'source');

					let categoriesCount = (categories.length ? ` from ${categories.length} source${categories.length > 1 ? 's' : ''}` : '');
					let speechOutput = `Coveo found ${totalCount} results ${categoriesCount}.\n\nThe top result is: ${topResult.raw.systitle}`;
					let cardContent = `Got ${totalCount} results${categoriesCount}.\n\nThe top result is:\n${topResult.raw.systitle}`;

					Object.assign(this.attributes, {
						'query': url,
						'summary': topResult.excerpt,
						'sources': categories
					});

					if (topResult.raw.source) {
						cardContent += ` from source ${topResult.raw.source}`;
					}
					if (topResult.excerpt) {
						cardContent += '\n' + topResult.excerpt;
					}
					speechOutput += `.\nI am sending you an email with the top ${Math.min(10, totalCount)} results.`;

					let cardTitle = 'Your query for: ' + query;

					console.log('RESPONSE: ', speechOutput);
					this.emit(':askWithCard', speechOutput, 'Do you want more info?', cardTitle, cardContent);
					sendSESMail(query, response.results);
				});
			})
			.on('error', (e) => {
				console.log('ERROR:', e);
				this.emit(':tell', 'Sorry, we had an error.');
			});
		}
		catch (e) {
			this.emit(':tell', 'Sorry, we had an error. ' + e.message);
		}
	},
	'GetSummary': function () {
		try {
			console.log('ATTRIBUTES(GetSummary): ', JSON.stringify(this.attributes));

			let summary = (this.attributes || {}).summary;
			if (summary) {
				this.emit(':ask', 'The summary is: ' + summary, '');
			}
			else {
				this.emit(':ask', 'Sorry, not sure what summary you want.');
			}
		}
		catch (e) {
			this.emit(':tell', 'Sorry, we had an error. ' + e.message);
		}
	},
	'GetSources': function () {
		try {
			console.log('ATTRIBUTES(GetSources): ', JSON.stringify(this.attributes));
			let sources = (this.attributes || {}).sources;
			if (sources && sources.length) {
				this.emit(':ask', 'The sources from your last request are: ' + sources.join(', '), 'You can get the top result from one source.');
			}
			else {
				this.emit(':ask', 'Sorry, not sure what you mean.');
			}
		}
		catch (e) {
			this.emit(':tell', 'Sorry, we had an error. ' + e.message);
		}
	},
	'GetTopFromSource': function () {
		try {
			console.log('GetTopFromSource: ', JSON.stringify(this.attributes), JSON.stringify(this.event.request.intent));

			let source = this.event.request.intent.slots.source.value;
			let url = (this.attributes || {}).query;
			if (url && source) {
				url += '&cq=' + encodeURIComponent(`@source="${source}"`);

				console.log('URL: ', url);
				https.get(url, (res) => {
					let body = '';
					res.on('data', (data) => {
						body += data;
					});
					res.on('end', () => {
						let response = JSON.parse(body),
							len = response.results.length,
							topResult = len ? response.results[0] : { raw: {} };

						if (len < 1) {
							this.emit(':tell', 'Sorry, we found no result.');
							return;
						}

						let speechOutput = `The top result is: ${topResult.raw.systitle}`;

						Object.assign(this.attributes, {
							'query': url,
							'summary': topResult.excerpt
						});

						if (topResult.excerpt) {
							speechOutput += '\nThe summary is:' + topResult.excerpt;
						}

						console.log('RESPONSE: ', speechOutput);
						this.emit(':tell', speechOutput);
					});
				})
				.on('error', (e) => {
					console.log('ERROR:', e);
					this.emit(':tell', 'Sorry, we had an error.');
				});
			}
			else {
				this.emit(':ask', 'Sorry, not sure what you mean.', 'What is the source?');
			}
		}
		catch (e) {
			this.emit(':tell', 'Sorry, we had an error. ' + e.message);
		}
	},
	'AMAZON.HelpIntent': function () {
		console.log('REQUEST(help): ', JSON.stringify(this.event.request));
		this.emit(':ask', this.t('HELP_MESSAGE'), this.t('HELP_MESSAGE'));
	},
	'AMAZON.CancelIntent': function () {
		console.log('REQUEST(cancel): ', JSON.stringify(this.event.request));
		this.emit(':tell', 'ok');
	},
	'AMAZON.StopIntent': function () {
		console.log('REQUEST(stop): ', JSON.stringify(this.event.request));
		this.emit(':tell', 'Goodbye!');
	},
	'Unhandled': function () {
		console.log('REQUEST(unhandled): ', JSON.stringify(this.event.request));
		this.emit(':tell', 'Sorry, there was an error.');
	}
};


exports.handler = function (event, context, callback) {
	const alexa = Alexa.handler(event, context);
	alexa.appId = APP_ID;
	// To enable string internationalization (i18n) features, set a resources object.
	alexa.resources = languageStrings;
	alexa.registerHandlers(handlers);
	alexa.execute();
};
