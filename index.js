const fs = require('fs');
const rp = require('request-promise');
const URL = require('url').URL;
const moment = require('moment');
const logUpdate = require('log-update');
const lineApiUrl = 'https://api.line.me/liff/v1/apps';
const configFilePath = process.argv[2];
let configFileContent = fs.readFileSync(configFilePath, 'utf8');
let configFile = JSON.parse(configFileContent);
let configApps = configFile.apps;

function handleErrorMessage(functionName, err) {
  let errMessage = '';
  let statusMessage = err.error.message;
  switch (err.statusCode) {
    case 400:
      if (err.error.errors) {
        let errorResponseMessage = err.error.errors.map(errorResponse => {
          return `field "${errorResponse.field}" ${errorResponse.defaultMessage}`;
        });
        errMessage = errorResponseMessage.join(', ');
      } else {
        errMessage = `The request contains an invalid value or The maximum number of LIFF apps that can be added to the channel has been reached.`;
      }
      break;
    case 401: errMessage = 'Authentication failed.'; break;
    case 404:
      switch (functionName) {
        case 'update':
        case 'delete': errMessage = 'The specified LIFF app does not exist or The specified LIFF app belongs to another channel.'; break;
        case 'getall': errMessage = 'There is no LIFF app on the channel.'; break;
      };
      break;
  }

  return `Error on ${functionName} : [${statusMessage}] ${errMessage}`;
};

function createRequestOption(method, uri, body) {
  return {
    method,
    uri,
    body,
    json: true,
    headers: {
      Authorization: `Bearer ${configFile.channelAccessToken}`,
    },
    resolveWithFullResponse: true,
  };
}

async function getAllApps() {
  const logMessage = '1/3 - get LIFF apps that has registered to LINE ...';
  logUpdate(logMessage);
  return new Promise((resolve) => {
    rp(createRequestOption('get', lineApiUrl))
      .then((response) => {
        const result = (response.body && response.body.apps) ? response.body.apps : [];
        logUpdate(`${logMessage} found ${result.length} apps`);
        logUpdate.done();
        // logUpdate(JSON.stringify(result, '', 2));
        resolve(result);
      })
      .catch(() => {
        logUpdate(`${logMessage} found 0 app`);
        logUpdate.done();
        resolve([]);
      });
  });
}

async function addApp(url, type) {
  logUpdate('addApp');
  return new Promise((resolve, reject) => {
    let body = {
      view: { type, url },
    };
    rp(createRequestOption('post', lineApiUrl, body))
      .then((response) => {
        resolve((response.body && response.body.liffId) ? response.body.liffId : undefined);
      })
      .catch((err) => {
        logUpdate(handleErrorMessage('add', err));
        reject(err);
      });
  });
}

async function updateApp(liffId, url, type) {
  logUpdate('updateApp', liffId);
  return new Promise((resolve, reject) => {
    rp(createRequestOption('put', `${lineApiUrl}/${liffId}/view`, { type, url }))
      .then((response) => {
        if (response.statusCode === 200) {
          resolve();
        }
      })
      .catch((err) => {
        logUpdate(handleErrorMessage('update', err));
        reject(err);
      });
  });
}

async function deleteApp(liffId) {
  return new Promise((resolve, reject) => {
    rp(createRequestOption('delete', `${lineApiUrl}/${liffId}`))
      .then((response) => {
        if (response.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Can't delete app ${liffId} [${response.statusCode}]`));
        }
      })
      .catch((err) => {
        logUpdate(handleErrorMessage('delete', err));
        reject(err);
      });
  });
}

// function saveApps(registeredApps) {
//   // logUpdate('saveApps');
//   return new Promise((resolve, reject) => {
//     let savedApps = configApps.map((configApp) => {
//       let registered = registeredApps.find((app) => {
//         return app.view.url === configFile.baseUrl + configApp.url;
//       });
//       return {
//         ...configApp,
//         liffId: registered ? registered.liffId : undefined,
//       };
//     });
//     fs.writeFileSync(saveAppFile, JSON.stringify(savedApps, '', 2));
//     resolve();
//   });
// }

// async function fetchAndSaveAllApps() {
//   logUpdate('fetchAndSaveAllApps');
//   return new Promise((resolve, reject) => {
//     getAllApps()
//       .then((registeredApps) => {
//         return saveApps(registeredApps);
//       })
//       .catch(err => {
//         reject(err);
//       });
//   });
// }

// async function getSavedAppFile() {
//   // logUpdate('getSavedAppFile');
//   return new Promise((resolve, reject) => {
//     fs.readFile(saveAppFile, {}, (err, fileContent) => {
//       if (err) {
//         reject(err);
//       }
//       if (fileContent) {
//         resolve(JSON.parse(fileContent));
//       }
//     });
//   });
// }

async function deleteUnUseApps(registeredApps) {
  const logMessage = '2/3 - delete LIFF apps that does not in config file ...';
  let logMessageStatus = logMessage;
  logUpdate(logMessage);

  if (!configFile.deleteUnUseApp) {
    logUpdate(`${logMessage} skip`);
    logUpdate.done();
    return;
  }

  return new Promise((resolve, reject) => {
    Promise.all(registeredApps.map(async (registeredApp) => {
      let parse = new URL(registeredApp.view.url);
      let existInConfig = configApps.find((app) => {
        return app.url === parse.pathname;
      });

      if (!existInConfig) {
        logMessageStatus += `\n      deleting app ${registeredApp.name} [${registeredApp.liffId}] from LINE server ...`;
        logUpdate(logMessageStatus);
        return deleteApp(registeredApp.liffId);
      }
      // delete all
      // return deleteApp(registeredApp.liffId);
    })).then(() => {
      logMessageStatus += '\n     done';
      logUpdate(logMessageStatus);
      logUpdate.done();
      resolve();
    });
  });
}

async function start() {
  console.log('LIFF apps register started');

  let registeredApps = await getAllApps();

  // check and delete unuse app
  await deleteUnUseApps(registeredApps);

  // check all config app
  logUpdate('3/3 - add or modify LIFF apps to LINE ...');
  logUpdate.done();
  Promise.all(configApps.map(async (configApp) => {
    let existInRegisteredApp = registeredApps.find((app) => {
      return app.liffId === configApp.liffId;
    });
    if (existInRegisteredApp) {
      // logUpdate(`      updating app ${configApp.name} [${configApp.liffId}] on LINE server`);
      const timestamp = `?timestamp=${moment().format('x')}`;
      return updateApp(configApp.liffId, configFile.baseUrl + configApp.url + timestamp, configApp.type);
    } else {
      // logUpdate(`      registering app ${configApp.name} on LINE server`);
      return addApp(configFile.baseUrl + configApp.url, configApp.type)
        .then((liffId) => {
          // logUpdate('liffId', liffId);
          configApp.liffId = liffId;
        });
    }
  }))
    .then(() => {
      logUpdate('configApps', JSON.stringify(configApps, '', 2));
      logUpdate.done();
    });
}

start();
