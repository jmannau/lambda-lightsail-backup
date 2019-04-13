# Lambda Lightsail Backup

A [Serverless](https://serverless.com) function (runnable on AWS Lambda) to manage incremental snapshots of AWS Lightsail instances.

Inspired by/based on [vidanov/lambda-nodejs-lightsail-backup](https://github.com/vidanov/lambda-nodejs-lightsail-backup) & [weareadjacent/lambda-lightsail-backup](https://github.com/weareadjacent/lambda-lightsail-backup).

## Setup

### Step 1. Setup AWS Credentials and Serverless

See [Serverless Getting Started with](https://serverless.com/framework/docs/providers/aws/guide/quick-start/)

### Step 2. Clone this repo

### Step 3. Configure the backups

By default, this will backup all lightsail instances in the current region, nightly. It will retain daily backups for 14 dyas, weekly backsups for 12 weeks and monthly backups for 12 months. These can be configured in [serverless.yml](serverless.yml#L14) with the environment variables.

```
environment:
  # BACKUP_INSTANCES: 'instance1,instance2'
  # BACKUP_DAYS: 7
  # BACKUP_WEEKS: 12
  # BACKUP_MONTHS: 12
```

Make sure you setup your AWS region in [serverless.yml](serverless.yml#L12)

You can adjust when the backups will be executed in [serverless.yml](serverless.yml#L38) by changing the cron schedule

```
- schedule: cron(0 3 * * ? *)
```

### Step 4. `npm install`

### Step 5. Test locally

You can test this locally by using `$ serverless invoke local -f backups`

### Step 6. Deploy

`$ serverless deploy`
