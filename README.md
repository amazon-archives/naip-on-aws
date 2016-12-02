# NAIP on AWS viewer

The NAIP on AWS viewer is a serverless, lightweight, fast, and infinitely scalable website designed to display data from the [NAIP on AWS](https://aws.amazon.com/public-data-sets/naip/) public data set. It uses [AWS Lambda](https://aws.amazon.com/lambda/), and [AWS API Gateway](https://aws.amazon.com/api-gateway/) to dynamically generate pages on the fly for hundreds of thousands of images. It is based on work originally done in [landsat-on-aws](https://github.com/awslabs/landsat-on-aws).

You can see an example of the website in action at https://f5f3hkneq5.execute-api.us-east-1.amazonaws.com/prod.


## Goals of this project

- **Fast.** Pages should load quickly.
- **Lightweight.** Hosting 100,000,000 pages should cost less than $100 per month.
- **Indexable.** Pages of the site should be indexable by search engines.
- **Linkable.** All unique pages of the site should have a [cool URI](http://www.w3.org/Provider/Style/URI.html)

### What this project is good for

- Making NAIP imagery discoverable via search engines.
- Demonstrating how scalable websites can be built based on structured data.
- Demonstrating methods of controlling egress costs while publicly sharing data

### What this project _not_ good for

- Analyzing NAIP data.

## Structure

The project structure is a slightly modified version of the [serverless-starter](https://github.com/serverless/serverless-starter) project. Because we're returning HTML views instead of JSON, there is also a `restApi/views` directory which contains HTML templates that are rendered dynamically at request time, based on query inputs.

The project relies on dynamically generating HTML output using Lambda functions at request time (requests handled by API Gateway). An updater can be run to check the latest files in the `aws-naip` S3 bucket and creates a small amount of underlying data files that get stored on S3. These files are requested by Lambda functions as needed, before HTML is returned. This means that we are only serving content-full (as opposed to using JavaScript to load data within the page itself) from API Gateway which makes indexing easier. This also means that outside of our small set of data files, we are not storing anything to present the hundreds of thousands of pages needed to reflect the underlying NAIP imagery.

## Egress Control

From the individual imagery page, metadata, TIFFs and shapefiles can be downloaded. When a request is made for this data (via the webpage or programmatically), a short-lived, signed URL is generated and returned to the requester. The code shows off three mechanisms for controlling total egress:

1) Via API Gateway, the `/d` endpoint is the only endpoint to have throttling turned on. By default, this is 1,000 requests per second with burst up to 2,000.

2) When the signed URL is requested, we also do a `headObject` request to get object size. We could store this data somewhere (Amazon ElastiCache or Amazon RDS) and use it to deny download requests based on total amount of data already transferred.

3) Via [Budgets](http://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/budgets-managing-costs.html) you can set a monthly/quarterly/yearly budget for total cost of egress. When these limits are reached, a message is sent via AWS SNS which causes this code to greatly lower throttling limits. This code shows the example of a monthly setup where throttling limits are reset at beginning of month and lowered once budget is reached (code for this is in `naip/throttle/handler.js`. This topic is created manually and referenced in `restApi/naip/throttle/s-function.json`.

## To run and deploy

1. Download Node.JS from https://nodejs.org/download/ and install it.

2. Clone or download this repository and go into project folder.

3. Install [serverless](http://serverless.com/) globally with `npm install -g serverless`.

4. Install package dependencies with `npm install`.

5. Init serverless project with `sls project init` and follow prompts.

6. Run `sls client deploy` and take note of the S3 bucket URL returned (this will deploy some static assets to S3).

7. First time only, you will need to add some properties to the newly created `_meta/s-variables-common.json` file. The `baseURL` is the base URL of the website (this goes into creating the sitemap, if you don't care about that, go ahead and leave blank), `staticURL` is the URL of the S3 bucket for static assets (you'll see the bucket after you run `sls client deploy`). This should look something like below (make sure format matches below and includes https and trailing slash and keep in mind `us-east-1` just used `s3.amazonaws.com/foo`).
>```
>"baseURL": "https://naiponaws.com/",
>"staticURL": "https://s3.amazonaws.com/naiponaws.com-development-us-east-1/",
>"apiGatewayId": "f5f3hkneq5"
>```

8. Deploy all the functions and endpoints once. From then on out, you can just deploy as you make changes to individual files. There are a number of different ways to deploy with serverless (refer to [documentation](http://docs.serverless.com/v0.5.0/docs)), but to deploy all try `sls dash deploy`, select everything and deploy.

9. Run the `naip-updater` function once to build up some required static files on S3 with `sls function run naip-updater -d`.

10. Once you've deployed everything, you should see in the console a URL to your endpoints to test out. You'll only need to make new deploys when you make changes to files.

`sls client deploy` currently overwrites other files when deploying, which removes the data files created by running `naip-updater`. To work around this, you can either rerun `naip-updater` after each deploy of static assets, or you can deploy assets manually by doing something like `aws s3 cp client/dist/assets s3://naiponaws.com-dev-us-west-2/assets --recursive`.