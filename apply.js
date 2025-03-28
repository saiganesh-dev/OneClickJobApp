const { chromium } = require('playwright');
const fs = require('fs/promises');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false }); // Use headless: true for headless mode
  const context = await browser.newContext();
  const appliedJobs = []; // Store applied jobs
  const allJobLinks = []; // Store all job links

  try {
    const page = await context.newPage();
    // Login logic
    await page.goto('https://www.dice.com/signin');
    await page.fill('input[type="email"]', 'saiganesh6323@gmail.com');
    await page.click('button[type="submit"]');
    await page.fill('input[type="password"]', 'Lakshy@2025');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Job search base URL
    const diceBaseURL = 'https://www.dice.com/jobs?q=.net&countryCode=US&radius=30&radiusUnit=mi&pageSize=20&filters.postedDate=THREE&filters.employmentType=THIRD_PARTY&language=en';

    for (let pageNumber = 3; pageNumber <= 5; pageNumber++) {
      const pageURL = `${diceBaseURL}&page=${pageNumber}`;
      console.log(`Navigating to page ${pageNumber}: ${pageURL}`);
      await page.goto(pageURL);

      // Wait for job listings to load
      await page.waitForSelector('a.card-title-link');

      // Scrape job links 
      //      const jobLinks = allJobLinks.map((job) => `${baseURL}${job.id}${searchParams}`);
      const jobLinks = await page.$$eval('a.card-title-link', (links, pageNumber) =>
        links.map((link, index) => ({
          id: link.id, // Extract ID
          serialNumber: (pageNumber - 1) * 20 + index + 1, // Add serial number
          link: link.href,
        })).filter((job) => job.id)
      );

    //   const jobLinks = await page.$$eval('a.card-title-link', (links) =>
    //     links.map((link) => ({
    //       id: link.id,
    //       link: link.href,
    //     }))
    //   );
      allJobLinks.push(...jobLinks);
    }

    console.log(`Total jobs found: ${allJobLinks.length}`);

    // Iterate over job links and apply
    const baseURL = 'https://www.dice.com/job-detail/';
const searchParams = '?searchlink=search%2F%3Fq%3D.net%26countryCode%3DUS%26radius%3D30%26radiusUnit%3Dmi%26page%3D1%26pageSize%3D20%26filters.postedDate%3DTHREE%26filters.employmentType%3DTHIRD_PARTY%26language%3Den';

for (const job of allJobLinks) {
    try {
      // Open a new page for each job
      const jobPage = await context.newPage();
      const jobLink = job.link || `${baseURL}${job.id}${searchParams}`;
      console.log(`Navigating to job: ${jobLink}`);
      await jobPage.waitForTimeout(3000);

      // Navigate to the job page with retries
      let retryCount = 0;
      let navigationSuccess = false;
  
      while (retryCount < 3) {
        try {
          await jobPage.goto(jobLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
          navigationSuccess = true;
          break; // Break out of the loop if successful
        } catch (error) {
          retryCount++;
          console.error(`Navigation failed for ${jobLink}, retrying (${retryCount}/3)...`);
          if (retryCount === 3) throw error; // Throw error after 3 failed attempts
        }
      }
  
      if (!navigationSuccess) {
        console.error(`Failed to navigate to ${jobLink}. Skipping job.`);
        await jobPage.close();
        continue;
      }
  
      // Wait and check for the job overview section
      const overviewSelector = '.job-overview_jobDetails__kBakg';
      if (!(await jobPage.$(overviewSelector))) {
        console.error('Overview section not found, skipping...');
        await jobPage.close();
        continue;
      }
  
      const overviewText = await jobPage.$eval(overviewSelector, (el) => el.textContent).catch(() => null);
      if (!overviewText || !overviewText.includes('Accepts corp to corp applications')) {
        console.log('Job does not accept corp to corp applications.');
        await jobPage.close();
        continue;
      }
  
      // Check job details
      const jobDetailsSelector = '.job-details_jobDetails___c7LA';
      const jobDetailsText = await jobPage.$eval(jobDetailsSelector, (el) => el.textContent).catch(() => null);
      if (!jobDetailsText) {
        console.error('Job details not found, skipping...');
        await jobPage.close();
        continue;
      }
  
      // Check experience criteria
      const requiredExperienceMatch = jobDetailsText.match(/Minimum (\d+) years/);
      const requiredExperience = requiredExperienceMatch ? parseInt(requiredExperienceMatch[1], 10) : null;
  
      if (requiredExperience !== null && requiredExperience > 7) {
        console.log('Job requires too much experience, skipping...');
        await jobPage.close();
        continue;
      }
  
      console.log('Job meets experience criteria. Attempting to apply.');
  
      // Determine resume file based on keywords
      let resumeFile = 'Venkata Sai_.Sr.NetFullStack.docx';
      if (jobDetailsText.includes('angular')) resumeFile = 'Venkata Sai Ganesh Chadalawada_.NetCA.docx';
      else if (jobDetailsText.includes('react')) resumeFile = 'Ganesh Chadalawada_.NetCR.docx';
      else if (jobDetailsText.includes('API-DEV')) resumeFile = 'Venkata Sai Ganesh Chadalawada_.NetAPIDev.docx';
      else if (jobDetailsText.includes('Blazor')) resumeFile = 'Venkata_Sai_Sr_NetFullStackBDev.docx';
  
      const resumePath = path.join('C:\\Users\\ganes\\Desktop\\Resumes', resumeFile);
  
      // Start applying
      const easyApplyButton = await jobPage.$('div.btn-group.btn-group--block button.btn.btn-primary');
      if (!easyApplyButton) {
        console.error('Easy Apply button not found, skipping...');
        await jobPage.close();
        continue;
      }
      await easyApplyButton.click();
  
      // Handle resume upload
      const fileInputSelector = 'input[type="file"]';
      await jobPage.waitForSelector(fileInputSelector);
      await jobPage.setInputFiles(fileInputSelector, [resumePath]);
      console.log('Resume uploaded successfully.');
  
      // Click through the application steps
      while (true) {
        try {
          const nextButton = await jobPage.$('div.navigation-buttons.btn-right button.seds-button-primary.btn-next');
          if (!nextButton) break;
          await nextButton.click();
          await jobPage.waitForTimeout(500); // Wait briefly between steps
        } catch {
          break;
        }
      }
  
      // Submit the application
      const submitButton = await jobPage.$('button.seds-button-primary.btn-next');
      if (submitButton) {
        await submitButton.click();
        console.log('Application submitted successfully.');
      } else {
        console.error('Submit button not found.');
      }
  
      await jobPage.close();
    } catch (error) {
      console.error(`Error processing job:`, error);
    }
  }
  
    // Save applied and total jobs
    await fs.writeFile('./applied_jobs.json', JSON.stringify(appliedJobs, null, 2));
    await fs.writeFile('./all_jobs.json', JSON.stringify(allJobLinks, null, 2));
    console.log('Job data saved.');
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }
})();
