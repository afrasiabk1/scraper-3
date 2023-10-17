const puppeteer = require('puppeteer');
const axios = require('axios');
const url = require('url');
const appscripturl="https://script.google.com/a/macros/ultrarev.io/s/AKfycbzuXVJ1GFhJasszNpoiMNFS3Tavn6pFAgKdKTa8L9U-4Vw2p1dNa9WpneKYYsGzkJshUw/exec";
// Function to fetch domain list from API 1
async function fetchDomainList() {
  try {
    const response = await axios.get(`${appscripturl}?action=getforscrape`);
    return response.data;
  } catch (error) {
    console.error('Error fetching domain list:', error);
    throw error;
  }
}

let browser;
let page;


async function extractLanguageCodesFromLinks(page) {
  try {
    const languageCodePattern = /\/([a-z]{2}(-[A-Z]{2})?)\//g; // Language code pattern (e.g., /en-US/)
    const links = await page.$$eval('a[href]', (elements) => elements.map((element) => element.href));
    const languageCodes = [];

    links.forEach((link) => {
      const matches = link.match(languageCodePattern);
      if (matches) {
        matches.forEach((match) => {
          const languageCode = match.replace(/\//g, ''); // Remove slashes from the match
          if (!languageCodes.includes(languageCode)) {
            languageCodes.push(languageCode);
          }
        });
      }
    });

    return languageCodes;
  } catch (error) {
    console.error('Error extracting language codes from links:', error);
    return [];
  }
}

// Function to check multi-language support for a domain
async function checkMultiLanguageSupport(domain) {
  
  // Normalize URL to ensure it starts with 'http://'
  domain = `https://${domain}`;
  console.log(`domain:${domain}`)

  if (!browser) {
    browser = await puppeteer.launch({headless: false});
     page = await browser.newPage();
  }



  try {

    await page.goto(domain, {waitUntill: 'load', timeout: 0});
    let langAttribute, langMetaTag, hrefLangTags, languageDetected, region,languageCodesFromLinks = null;

    try {
      // Method 1: Check HTML lang attribute
      langAttribute = await page.$eval('html', (element) => element.lang);
    } catch (error) {
      langAttribute = null;
    }

    try {
      // Method 2: Check meta tags
      langMetaTag = await page.$eval('meta[http-equiv="Content-Language"]', (element) => element.content);
    } catch (error) {
      langMetaTag = null;
    }

    try {
      // Method 3: Check HREFLang attributes
      hrefLangTags = await page.$$eval('link[rel="alternate"]', (elements) => {
        return elements.map((element) => element.getAttribute('hreflang'));
      });
    } catch (error) {
      hrefLangTags = null;
    }

    try{
       // Method 4: Extract language codes from anchor links
     languageCodesFromLinks = await extractLanguageCodesFromLinks(page);
    }
    catch (error) {
      languageCodesFromLinks = null;
    }
    
    // Create an object to store multi-language data
    const multiLanguageData = {
      domain: domain,
      htmlLangAttribute: langAttribute,
      metaTag: langMetaTag,
      hrefLangTags: hrefLangTags,
      languageCodesFromLinks:languageCodesFromLinks
    };
    
   
    // Send the data to your API
    await updateData(multiLanguageData);

  } catch (error) {
    console.error('Error checking multi-language support:', error);
  } finally {
 //   await browser.close();
  }

}


function extractRegionFromLanguages(languages) {
  if (Array.isArray(languages)) {
    return languages.map((language) => {
      if (language) {
        const languageAndRegion = language.split('-');
        return languageAndRegion.length > 1 ? languageAndRegion[1] : null;
      }
      return null;
    }).filter((region) => region !== null);
  } else if (typeof languages === 'string') {
    const languageAndRegion = languages.split('-');
    if (languageAndRegion.length > 1) {
      return languageAndRegion[1];
    }
  }
  return null;
}



async function updateData(filteredMultiLanguageData) {


  let languagesData,regionData,languagesCount,regionCount;
  if(filteredMultiLanguageData.hrefLangTags.length>0){
    languagesData=filteredMultiLanguageData.hrefLangTags;
  }

  else if(filteredMultiLanguageData.languageCodesFromLinks!=null){
    languagesData=filteredMultiLanguageData.languageCodesFromLinks;
  }
  
  
  else if(filteredMultiLanguageData.metaTag!=null){
    languagesData=filteredMultiLanguageData.metaTag;
  }

  console.log("filteredMultiLanguageData.htmlLangAttribute",filteredMultiLanguageData.htmlLangAttribute)
  
  if(filteredMultiLanguageData.htmlLangAttribute){
    languagesData.push(filteredMultiLanguageData.htmlLangAttribute)
  }
  
  languagesData = languagesData.filter((item) => item !== null && !item.toLowerCase().includes('default'));
 
  languagesData = new Set(languagesData);
  languagesData=Array.from(languagesData);

  regionData=extractRegionFromLanguages(languagesData);

  regionData = new Set(regionData);
  regionData=Array.from(regionData);

  languagesCount=languagesData.length;
  regionCount=regionData.length;

  languagesData=languagesData.join(",");
  regionData=regionData.join(",");

  try {
   const response = await axios.get(`${appscripturl}?action=update&domain=${filteredMultiLanguageData.domain.replace("https://","")}&totalLanguages=${languagesCount}&totalRegions=${regionCount}&languages=${languagesData}&regions=${regionData}`);
  } catch (error) {
    console.error( error);
    throw error;
  }
}



async function updateStatus(domain) {
  
  
  try {
   const response = await axios.get(`${appscripturl}?action=updateStatus&domain=${domain}`);
  } catch (error) {
    console.error( error);
    throw error;
  }
}


// Main function to orchestrate the process
async function main() {
  try {
    const domainList = await fetchDomainList();
    if(domainList.Website){
    await updateStatus(domainList.Website);
    await checkMultiLanguageSupport(domainList.Website);
  }
  } 
  catch (error) {
    console.error('An error occurred:', error);
  }

main();

}

// Run the main function
main();
