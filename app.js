const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const EOL = require('os').EOL;
const timeout = 200;
let searchTable = [];
let invalidNames = [];
let limit = 0;
let count = 0;
let writeCount = 0;
let lastLog = true;
let useEOL="";
// availbility
function checkDomainName(domainName) {
  if (nameIsGood(domainName)) {
    const form = new FormData();
    form.append('DomainName', domainName);
    // To set boundary in the header field 'Content-Type'
    const formHeaders = form.getHeaders();

    axios.post('https://registry.domain.fi/search/fi/app/DomainSearch', form, {
      headers: {
        ...formHeaders,
      },
    })
      .then(response => {
        count++;
        // true = Log to console and write to file
        if (response.data.Available) {
          writeToFile(domainName);
          useEOL = lastLog ? "" : EOL;
          successToConsole(useEOL,domainName);
        } else { // Log progress
          let progress = lastLog ? " .":".";
          process.stdout.write(progress);
          lastLog = false;
        }
        if (count < limit) {
          nextQuery();
        } else {searchFinished()}
      })
      .catch(error => console.log(error))
  } else{
    count++;
    if (count < limit) {
      nextQuery();
    } else {searchFinished()}
  }
}

function successToConsole(eol,name){
  console.log(eol+ ' Domain:', name, '  |  ', "Count:", count);
  lastLog = true;
}

function nextQuery(){
  // Start another query with timer. Timeout is not mandatory but MAY avoid being blocked by firewall.
  setTimeout(checkDomainName, timeout, searchTable[count])
}

function searchFinished(){
  console.log();
  console.log("Search finished!", EOL, "Results are found in results.txt", EOL, "Available domains:", writeCount, "/", count);
  console.log();
  console.log("List on invalid names in searchTable.txt");
  invalidNames.forEach((item)=>{console.log(item)})
}

function writeToFile(domain) { // Will append results to the file IF exists
  try {
    fs.writeFileSync('results.txt', domain + EOL, {flag: 'a'});
    writeCount++;
  } catch (err) {
    console.error(err)
  }
}

function writeSearchTable() {
  try {
    console.log("Writing a search table...");
    fs.writeFileSync('searchTable.txt', "", {flag: 'a'});
    console.log("Search table written!", EOL, "1. Add domain names to searchTable.txt one domain = one line", EOL, "2. run node app.js again");
  } catch (err) {
    console.error(err)
  }
}

function readSearchTable() {
  try {
    console.log("Reading search table...");
    searchTable = fs.readFileSync('searchTable.txt', 'utf8');
    searchTable = searchTable.split(EOL);
    limit = searchTable.length-1; // -1 because there is a empty row at the end of the text file.
    console.log("Search Table Read!")
  } catch (err) {
    console.error(err)
  }
}

//// Name validity checks
/*
This is just a crude filter and WILL FILTER SOME VALID NAMES TOO.
Check the full restrictions here:
https://www.traficom.fi/fi/viestinta/fi-verkkotunnukset/millainen-hyva-verkkotunnus
*/
let valList = [];
valList[0] = /^[a-z0-9,å,ö,ä,-]*$/g; // Allowed chars
valList[1] = /^[^-].*$/g; // NOT allowed start
valList[2] = /^.*[^-]$/g; // NOT allowed end

function nameIsGood(name) {
  if (name === undefined || name.length < 2) {
    alertDenied(name);
    return false
  }

  // Regex checks
  for (let i = 0; i < valList.length; i++) {
    if (name.match(valList[i]) === null) {
      alertDenied(name);
      return false
    }
  }
  return true;
}

function alertDenied(name) {
  invalidNames.push(name);
}

//// Program starts here
// Write the searchTable.txt IF needed. Otherwise read its content and start querying.
if (!fs.existsSync('searchTable.txt')) {
  writeSearchTable();
} else {
  readSearchTable();
  console.log();
  console.log("Search starting!", EOL, ". = Taken domain  /  Domain: freeDomainName  |  Count: numberOfSearches");
  checkDomainName(searchTable[count]);
}
