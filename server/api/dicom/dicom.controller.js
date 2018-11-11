const {lstatSync, readdirSync} = require('fs');
const {join} = require('path');

const {ASSETS_DIR, ASSETS_DIR_DEV, ENV_DEV} = require('../../constants.json');
const Logger = require('../../logger');

const ENV = process.env.NODE_ENV || ENV_DEV;
const dicomPath = join(process.cwd(), ENV === ENV_DEV ? '/src/assets' : ASSETS_DIR, '/dicom');
const datasetsPath = join(dicomPath, '/datasets');
const previewsPath = join(dicomPath, '/previews');

let previews;
let datasetDescriptors;

module.exports = class DicomController {

  static getList(req, res) {
    if (ENV === ENV_DEV) {
      datasetDescriptors = getDatasetDescriptors();
    }
    res.json(datasetDescriptors);
  }

  static init() {
    previews = readdirSync(previewsPath);
    datasetDescriptors = getDatasetDescriptors();
  }
};

function getDatasetDescriptors() {
  Logger.info(`Loads datasets from ${datasetsPath}`);

  return readdirSync(datasetsPath)
    .map(name => ({
      files: getFiles(datasetsPath, name),
      name: name.replace(/\.[a-z]+$/, ''),
      preview: previews.find(p => p.includes(name))
    }));
}

function getFiles(folderPath, name, deepLevel = 0) {
  const path = join(folderPath, name);

  return lstatSync(path).isDirectory()
    ? readdirSync(path).map(fileName => `${name}/${fileName}`)
    : [name];
}
