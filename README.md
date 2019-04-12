# Lambda Lightsail Backup

A [Serverless](https://serverless.com) function (runnable on AWS Lambda) to manage incremental snapshots of AWS Lightsail instances.

Inspired by/based on [vidanov/lambda-nodejs-lightsail-backup](https://github.com/vidanov/lambda-nodejs-lightsail-backup) & [weareadjacent/lambda-lightsail-backup](https://github.com/weareadjacent/lambda-lightsail-backup).


## Setup

### Step 1. Clone this repo

### Step 2. Configure the backups

By default, this will backup all lightsail instances in the current region, nightly. It will retain daily backups for 14 dyas, weekly backsups for 12 weeks and monthly backups for 12 months.  These can be configured in [serverless.yml](serverless.yml#L14) with the environment variables.

```
environment:
  # BACKUP_INSTANCES: 'instance1,instance2'
  # BACKUP_DAYS: 7
  # BACKUP_WEEKS: 12
  # BACKUP_MONTHS: 12
```

You can adjust when the backups will be executed in [serverless.yml](serverless.yml#L37) by changing the cron schedule

```
- schedule: cron(0 3 * * ? *)
```

### Step 3. `npm install`

### Step 4 Test locally

You can test this locally by using `$ serverless invoke local -f backups`

### Step 5 Deploy

`$ serverless deploy`
