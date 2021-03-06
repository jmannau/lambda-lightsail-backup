// Load AWS APIs
import { ScheduledHandler } from "aws-lambda";
import * as AWS from "aws-sdk";
import "source-map-support/register";

const region = process.env.AWS_REGION || "ap-southeast-2";
AWS.config.update({ region });
const lightsail = new AWS.Lightsail();

/**
 * How many days to keep daily backups. Can be overridden via
 * environment variable.
 * @type {Number}
 */
const BACKUP_DAYS = +process.env.BACKUP_DAYS || 14;

/**
 * How many weeks to keep weekly backups. Can be overridden via
 * environment variable.
 * @type {Number}
 */
const BACKUP_WEEKS = +process.env.BACKUP_WEEKS || 12;

/**
 * How many months to keep monthly backups. Can be overridden via
 * environment variable.
 * @type {Number}
 */
const BACKUP_MONTHS = +process.env.BACKUP_MONTHS || 12;

/**
 * Convenience for calculating dates
 * @type {Date}
 */
const NOW = new Date();
const NOW_DATE_STRING = NOW.toDateString();
const ONE_DAY = 1000 * 60 * 60 * 24;

/**
 * Store backups chronologically, keyed by instance name.
 * @type {Object}
 */
let backups: { [key: string]: AWS.Lightsail.InstanceSnapshot[] } = {};

/**
 * Main handler from AWS lambda.
 */
exports.handler = (async () => {
  const instances = process.env.BACKUP_INSTANCES
    ? process.env.BACKUP_INSTANCES.split(",")
    : await getAllInstances();
  await loadBackups(instances);

  for (let instance of instances) {
    if (!hasBackupToday(instance)) {
      await createBackup(instance);
    }

    await pruneBackups(instance);
  }
}) as ScheduledHandler;

async function loadBackups(instances: string[]) {
  let page = 1;
  console.log(`Loading all snapshots (page ${page})`);

  let snapshots: AWS.Lightsail.InstanceSnapshot[] = [];
  let pageToken;
  do {
    console.log(`Loading all snapshots (page ${page})`);
    const {
      instanceSnapshots,
      nextPageToken
    } = await lightsail.getInstanceSnapshots({ pageToken }).promise();
    pageToken = nextPageToken;
    snapshots = snapshots.concat(instanceSnapshots);
    page++;
  } while (pageToken);

  for (let snapshot of snapshots) {
    // Ignore snapshots not created via this script.
    if (!isBackupSnapshot(snapshot)) continue;

    let instance = snapshot.fromInstanceName;

    // Ignore other instances.
    if (!instances.includes(instance)) continue;

    // Create an array per instance.
    backups[instance] = backups[instance] || [];
    backups[instance].push(snapshot);
  }

  // Sort by date.
  for (let [, instanceBackups] of Object.entries(backups)) {
    instanceBackups.sort((a, b) => +a.createdAt - +b.createdAt);
  }
}

/**
 * Whether or not a snapshot was created by this script (looks at name).
 * @param  {Object}   snapshot Snapshot object
 * @return {Boolean}
 */
function isBackupSnapshot(snapshot) {
  return snapshot.name.endsWith("-autosnap");
}

function getLatestBackup(instance: string) {
  let instanceBackups = backups[instance];
  if (!instanceBackups || instanceBackups.length === 0) {
    return null;
  }

  return instanceBackups[instanceBackups.length - 1];
}

function hasBackupToday(instance: string) {
  console.log(`${instance}: Checking for today's backup`);

  let latest = getLatestBackup(instance);
  if (!latest) return false;

  return latest.createdAt.toDateString() === NOW_DATE_STRING;
}

function createBackup(instance: string) {
  console.log(`${instance}: Creating backup`);

  let name = `${instance}-${NOW.getTime()}-autosnap`;
  let params: AWS.Lightsail.CreateInstanceSnapshotRequest = {
    instanceName: instance,
    instanceSnapshotName: name
  };

  return lightsail
    .createInstanceSnapshot(params)
    .promise()
    .then(() => console.log(`${instance}: Snapshot ${name} created`))
    .catch(err => {
      console.error(`${instance}: Error creating snapshot`, err);
    });
}

async function pruneBackups(instance: string) {
  console.log(`${instance}: Pruning backups`);

  let instanceBackups = backups[instance];
  if (!instanceBackups) return;

  for (let backup of instanceBackups) {
    let date = backup.createdAt;
    let dayOfWeek = date.getDay();
    let dayOfMonth = date.getDate();
    let age = Math.floor((+NOW - +date) / ONE_DAY);

    let saveBackup = false;

    if (age <= BACKUP_DAYS) {
      console.log(
        `${instance}: Retaining daily backup from ${backup.createdAt}`
      );
      saveBackup = true;
    } else if (age <= BACKUP_WEEKS * 7) {
      // Is sunday?
      if (dayOfWeek === 0) {
        console.log(
          `${instance}: Retaining weekly backup from ${backup.createdAt}`
        );
        saveBackup = true;
      }
    } else if (age <= BACKUP_MONTHS * 30) {
      if (
        dayOfMonth <= 7 && // Is first week of month?
        dayOfWeek === 0 // Is Sunday?
      ) {
        console.log(
          `${instance}: Retaining monthly backup from ${backup.createdAt}`
        );
        saveBackup = true;
      }
    }

    if (!saveBackup) {
      console.log(`${instance}: Deleting backup from ${backup.createdAt}`);
      await deleteSnapshot(backup);
    }
  }
}

function deleteSnapshot(snapshot: AWS.Lightsail.InstanceSnapshot) {
  let params: AWS.Lightsail.DeleteInstanceSnapshotRequest = {
    instanceSnapshotName: snapshot.name
  };

  return lightsail
    .deleteInstanceSnapshot(params)
    .promise()
    .then(() =>
      console.log(
        `${snapshot.fromInstanceName}: Snapshot ${snapshot.name} deleted`
      )
    )
    .catch(err => {
      console.error(
        `${snapshot.fromInstanceName}: Error deleting snapshot ${
          snapshot.name
        }`,
        err
      );
    });
}

async function getAllInstances() {
  let allInstances: string[] = [];
  let pageToken;
  do {
    const { instances, nextPageToken } = await lightsail
      .getInstances({ pageToken })
      .promise();
    pageToken = nextPageToken;
    allInstances = allInstances.concat(instances.map(i => i.name));
  } while (pageToken);
  return allInstances;
}
