const {lstatSync, readdirSync} = require('fs');
const {join} = require('path');

const {ENV_DEV} = require('../../constants.json');

const ENV = process.env.NODE_ENV || ENV_DEV;
const dicomPath = join(process.cwd(), ENV === ENV_DEV ? '/src' : '/dist', '/assets/dicom');
const datasetsPath = join(dicomPath, '/datasets');
const previewsPath = join(dicomPath, '/previews');
const previews = readdirSync(previewsPath);

let datasetDescriptors = getDatasetDescriptors();

console.log(datasetDescriptors);

module.exports = class DicomController {
  static getList(req, res) {
    if (ENV === ENV_DEV) {
      datasetDescriptors = getDatasetDescriptors();
    }
    res.json(datasetDescriptors);
  }
};

function getDatasetDescriptors() {
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
