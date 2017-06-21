# alexa-skill
Using Coveo with Amazon Alexa.

## Description

This project show how to integrate Coveo with Amazon Alexa. It used the sample *[Alexa Skills sample for Node.js](https://github.com/alexa/skill-sample-nodejs-howto)* as a starting point.

## How to build

You need to create a Lambda function in AWS and a Alexa Skill.

### Lamdba function

1. Go to your [AWS Console](https://console.aws.amazon.com/lambda).
1. Create a new ___blank___ Lambda function with `Node.js 6.10` as the runtime.
1. Set the trigger to be `Alexa Skills Kit`, it will add the necessary permissions for Amazon Alexa to invoke your Lambda function.
1. Copy and paste the content of file `misc/lambda/index.js` as the Lambda code.
1. Set up the environment variables
    * `APP_ID` Your Alexa Skill application id
    * `COVEO_KEY` Your Coveo API key to perform searches against your Coveo organization.
    * `COVEO_PIPELINE` - (Optional) Define this variable if you are not using the default pipeline. Just use the name of the pipeline here.
    * `COVEO_URL` - (Optional) The url to the Coveo Search API. Default is `https://platform.cloud.coveo.com/rest/search/v2/`
    * `TEST_EMAIL_ADDR` Where to send the notifications by email.
1. Set the Role `service-role/Email` to be able to get Email notifications of your search with Alexa.
1. If you want to configure a _test event_, you can use the content of file `misc/lambda/test.event.json`



### Alexa skill

1. Go to your [Amazon Developer](https://developer.amazon.com/home.html) console, then in the ___Alexa___ tab.
1. Create a new Skill called `Coveo`
1. We choose `coveo` as invocation name for this sample
1. To upload the Interaction Model, go in their Builder(beta) interface for the Alexa Skills Kit.
1. Copy and paste the content of file `misc/alexa/model.json` usint their Code Editor,
1. Save and Build the model.
1. In the _Configuration_ section, add the ARN of your Lambda function.

## How to run

Using your Amazon Echo, you can:

_Scenario 1_
1. say `Open Coveo`
    * _Alexa welcomes you to Coveo Query_
1. say `Look for JavaScript Framework`
    * _Alexa tells you how many results Coveo found in how many sources, what is the top result_
1. `What are the sources?`
    * _Alexa tells you about the sources_
1. `Give the top results for source Tech News`
    * _Alexa tells you about the top results in that source_
1. `Thank you`

_Scenario 2_
1. `Ask Coveo to look for Sharepoint Connector`
    * _Alexa tells you how many results Coveo found in how many sources, what is the top result_
1. `What is the summary?`
    * _Alexa tells you the summary of the first results_
1. `Thank you`


## Available documentation

* [Coveo Search API](https://developers.coveo.com/display/CloudPlatform/Search+API)
* [Alexa Skills kit](https://developer.amazon.com/alexa-skills-kit)
* [Step-by-Step Guide to Build a How-To Skill](https://github.com/alexa/skill-sample-nodejs-howto)
* Alexa Skill testing tool: [https://echosim.io/](https://echosim.io/)

## Authors

- Gauthier Robe (https://github.com/gforce81)
- Jérôme Devost (https://github.com/jdevost)
