#!/usr/bin/env node
const WP = require('wp-cli');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
// const fs = require('fs');
const fs = require('fs-extra')
const download = require('download-git-repo');
const inquirer = require('inquirer');
const ora = require('ora');

const spinner = ora(' ')

/**
 * todo
 * --prompt=admin_password < admin_password.txt => wp core install
 */


 // question a crée
let wpConfigDownload = {
  path : './',
  locale : 'fr_FR',
}

// question a créé
let wpConfigInstall = {
  url : 'localhost:8888/test',
  title: 'Flinked',
  admin_user: 'admin',
  admin_password: 'admin',
  admin_email: 'alexbenotst@gmail.com',
}

let shellConfigLine = `cd ${wpConfigDownload.path} && wp config shuffle-salts`

let includeEnv = '';

const config = {
  ci: {
    dbPrefix: 'wp_',
    local: {
      url: 'localhost',
      host: 'localhost',
      pass: 'root',
      user: 'root'
    },
    preprod: {
      url: 'localhost',
      host: 'localhost',
      pass: 'root',
      user: 'root',
    }
  },
  git: true,
  wordpress: {
    themePathFolder : "./wp-content/themes",
    basePath : "./",
    themesName : "starter2019",
    plugin: {
      gravity: true,
      acf: true
    }
  }
}

const questions = [
  {
    type: 'input',
    name: 'adminName',
    message: 'Admin name',
  },
  {
    type: 'input',
    name: 'adminPass',
    message: 'Admin password',
  },
  {
    type: 'list',
    name: 'lang',
    message: 'Langue',
    choices: ['fr_FR', 'en_US'],
  },
  {
    type: 'input',
    name: 'localUrl',
    message: 'local url',
  },
  {
    type: 'input',
    name: 'localDBHost',
    message: 'local host',
  },
  {
    type: 'input',
    name: 'localDBName',
    message: 'local database name',
  },
  {
    type: 'input',
    name: 'localDBUser',
    message: 'local database user',
  },
  {
    type: 'input',
    name: 'localDBPass',
    message: 'local database password',
  },
  {
    type: 'input',
    name: 'dbPrefix',
    message: 'database prefix',
  },
  {
    type: 'input',
    name: 'prodUrl',
    message: 'prod url',
  },
  {
    type: 'input',
    name: 'prodFolderName',
    message: 'prod folder name',
  },
  {
    type: 'input',
    name: 'prodDBHost',
    message: 'prod host',
  },
  {
    type: 'input',
    name: 'prodDBName',
    message: 'prod database name',
  },
  {
    type: 'input',
    name: 'prodDBUser',
    message: 'prod database user',
  },
  {
    type: 'input',
    name: 'prodDBPass',
    message: 'prod database password',
  },
  {
    type: 'list',
    name: 'themes',
    message: 'Choose your theme',
    choices: ['basic', 'barba'],
  },
];

function UserInterface() {
  inquirer.prompt(questions).then(answers => {
    config.ci.local.url = answers.localUrl
    wpConfigInstall.url = answers.localUrl
    wpConfigDownload.locale = answers.lang
    wpConfigInstall.admin_user = answers.adminName
    wpConfigInstall.admin_password = answers.adminPass


    config.ci.local.host = answers.localDBHost
    config.ci.local.name = answers.localDBName
    config.ci.local.user = answers.localDBUser
    config.ci.local.pass = answers.localDBPass

    config.ci.dbPrefix = answers.dbPrefix

    config.ci.preprod.url = answers.prodUrl
    config.ci.preprod.host = answers.prodDBHost
    config.ci.preprod.name = answers.prodDBName
    config.ci.preprod.user = answers.prodDBUser
    config.ci.preprod.pass = answers.prodDBPass
    config.ci.preprod.folderName = answers.prodFolderName

    config.wordpress.themesName = answers.themes

    // downloadTheme()
    parseEnv()
  });
}

function parseEnv() {
  includeEnv = 
  `
  APP_ENV=local
  APP_PREFIX=${config.ci.dbPrefix}
  APP_SERVERHOST=flinked@51.68.44.225
  LOCAL_URL=${config.ci.local.url}
  LOCAL_HOST=${config.ci.local.host}
  LOCAL_DBNAME=${config.ci.local.name}
  LOCAL_DBUSER=${config.ci.local.user}
  LOCAL_DBPASS=${config.ci.local.pass}

  PREPROD_FOLDERNAME=${config.ci.preprod.folderName}
  PREPROD_URL=${config.ci.preprod.url}
  PREPROD_HOST=${config.ci.preprod.host}
  PREPROD_DBNAME=${config.ci.preprod.name}
  PREPROD_DBUSER=${config.ci.preprod.user}
  PREPROD_DBPASS=${config.ci.preprod.pass}
  SLACK_TOKEN=slacktoken
  `

  const includeMake = 
  `
  APP_ENV:=local
  APP_PREFIX:=${config.ci.dbPrefix}
  APP_SERVERHOST:=flinked@51.68.44.225
  LOCAL_URL:=${config.ci.local.url}
  LOCAL_HOST:=${config.ci.local.host}
  PREPROD_FOLDERNAME:=${config.ci.preprod.folderName}
  PREPROD_URL:=${config.ci.preprod.url}
  PREPROD_HOST:=${config.ci.preprod.host}
  `

  createEnvFile(includeEnv, includeMake)
}

function createEnvFile(includeEnv, includeMake) {
  spinner.start('Generate configuration file...')
  if (!fs.existsSync(`${config.wordpress.basePath}/.env`)){
    fs.appendFile(`${config.wordpress.basePath}/.env`, includeEnv , function (err) {
      if (err) throw err;
    });
  }
  if (!fs.existsSync(`${config.wordpress.basePath}/.makerc`)){
    fs.appendFile(`${config.wordpress.basePath}/.makerc`, includeMake , function (err) {
      if (err) throw err;
      spinner.succeed('Generate configuration file...')
      installRequirement()
    });
  }
}


function installRequirement() {
  let downloadPath = `${config.wordpress.basePath}/setup`;
  spinner.start()
  spinner.color = 'green';
	spinner.text = 'dowload requirement...';
  download(`flinked/starterfile`, downloadPath, function (err) {
    if(err) {
      return err;
    } else {
      spinner.succeed('dowload requirement')
      moveSetUpFile()
    }
  })
  // launchWpConfig()
}

function moveSetUpFile() {
  spinner.start('Move file...')
  if (!fs.existsSync(`${wpConfigDownload.path}/sh`)){
    fs.move(`${wpConfigDownload.path}/setup/ci/sh`, `${wpConfigDownload.path}/sh`, (err) => {
      if (err) throw err;

    });
  }
  fs.move(`${wpConfigDownload.path}/setup/ci/wp-cli.phar`, `${wpConfigDownload.path}/wp-cli.phar`, (err) => {
    if (err) throw err;
  });
  fs.move(`${wpConfigDownload.path}/setup/ci/package.json`, `${wpConfigDownload.path}/package.json`, (err) => {
    if (err) throw err;
  });
  fs.move(`${wpConfigDownload.path}/setup/config/.gitignore`, `${wpConfigDownload.path}/.gitignore`, (err) => {
    if (err) throw err;
  });
  fs.move(`${wpConfigDownload.path}/setup/config/wp-config.php`, `${wpConfigDownload.path}/wp-config.php`, (err) => {
    if (err) throw err;
  });
  fs.move(`${wpConfigDownload.path}/setup/config/wp-cli.yml`, `${wpConfigDownload.path}/wp-cli.yml`, (err) => {
    if (err) throw err;
  });
  fs.move(`${wpConfigDownload.path}/setup/config/composer.json`, `${wpConfigDownload.path}/composer.json`, (err) => {
    if (err) throw err;
    fs.remove(`${wpConfigDownload.path}/setup`, err => {
      if (err) throw err;
      spinner.succeed('Move file')
      // installComposer()
      createSendFolder()
    })
  });
}

function createSendFolder() {
  spinner.start('Create send file...')

  let infoContent = `
    username : ${wpConfigInstall.admin_user}
    password : ${wpConfigInstall.admin_password}
  `
  if (!fs.existsSync(`../setupforsite`)){
    fs.mkdirSync(`../setupforsite`);
    if (!fs.existsSync(`../setupforsite/.env`)){
      fs.appendFile(`../setupforsite/.env`, includeEnv , function (err) {
        if (err) throw err;
      });
    }
    if (!fs.existsSync(`../setupforsite/info.txt`)){
      fs.appendFile(`../setupforsite/info.txt`, infoContent , function (err) {
        if (err) throw err;
        spinner.succeed('Create send file')
        installComposer()
      });
    }
  }
}

async function installComposer() {
  spinner.start('Vendor installation...')
  const { stdout, stderr } = await exec(`cd ${wpConfigDownload.path} && composer install`);
  if(stdout || stderr) {
    spinner.succeed('Vendor installation')
    launchWpConfig()
  }
}

function launchWpConfig() {
  WP.discover({path : './'},function(WP){
    downloadFunc(WP)
  });
}


function downloadFunc(WP) {
  spinner.start('Dowload wordpress...')
    WP.core.download(wpConfigDownload, async function(err,info){ //get CLI info
      const sucessInfo = await info
      if(sucessInfo) {
        spinner.succeed('Dowload wordpress')
        createWpConfig(WP)
      }
  });	
}

function createWpConfig(WP) {
  spinner.start('Create wp config...')
  generateWpConfig(WP)
}

async function generateWpConfig(WP) {
  const { stdout, stderr } = await exec(shellConfigLine);
  if(stdout) {
    spinner.succeed('Create wp config')
    createDb(WP)
  }
}

function createDb(WP) {
  spinner.start('Create database...')
  WP.db.create(async function(err,info){ //get CLI info
    const sucessInfo = await info
    if(sucessInfo) {
      spinner.succeed('Create database')
      installWP(WP)
    }
  });
}

function installWP(WP) {
  spinner.start('Install wordpress...')
  WP.core.install(wpConfigInstall, async function(err,info,result){ //get CLI info
    const sucessResult = await result
    const sucessInfo = await info
    if(sucessInfo || sucessResult) {
      spinner.succeed('Install wordpress')
      downloadTheme()
    }
  });
}

function downloadTheme() {
  spinner.start('Download theme...')
  let downloadPath = `${config.wordpress.themePathFolder}/flinked/`;
  
  download(`flinked/starter2019#${config.wordpress.themesName}`, downloadPath, function (err) {
    if(err) {
      return err;
    } else {
      spinner.succeed('Download theme')
      setUpTheme()
    }
  })
}

async function setUpTheme() {
  spinner.start('Set up theme...')
  const { stdout, stderr } = await exec(`cd ${config.wordpress.themePathFolder}/flinked/builder && yarn && gulp build`);
  if(stdout || stderr) {
    spinner.succeed('Set up theme')
    setCI()
  }
}


async function setCI() {
  spinner.start('Set up continious integration...')
  const { stdout, stderr, err } = await exec(`cd ${config.wordpress.basePath} && yarn`);
  if(stdout || stderr) {
    pushCI()
  }
}


function pushCI() {
  spinner.succeed('Set up continious integration')
  exec(`cd ${config.wordpress.basePath} && yarn run initCi`);
}


UserInterface()
