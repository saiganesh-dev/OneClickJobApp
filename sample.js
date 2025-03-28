const { chromium } = require('playwright');
const fs = require('fs/promises');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false }); // Set to `true` for headless mode
  const context = await browser.newContext();

  try {
    // Login logic (replace with your credentials)
    const page = await context.newPage();
    await page.goto('https://www.dice.com/signin');
    await page.fill('input[type="email"]', 'saiganesh6323@gmail.com');
    await page.click('button[type="submit"]');
    await page.fill('input[type="password"]', 'Lakshy@2025');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Job search URL with desired filters
    const diceURL = 'https://www.dice.com/jobs?q=.net&countryCode=US&radius=30&radiusUnit=mi&page=1&pageSize=20&filters.postedDate=THREE&filters.employmentType=THIRD_PARTY&language=en';

    const allJobLinks = []; // Store all job links across pages
    
    // Loop through all relevant pages (adjust based on actual number of pages)
    for (let pageNumber = 1; pageNumber <= 5; pageNumber++) {
      const pageURL = `${diceURL}&page=${pageNumber}`; // Corrected line
      console.log(`Navigating to page ${pageNumber}: ${pageURL}`);
      const page = await context.newPage();
      await page.goto(pageURL);
      // Wait for job listings to load
      await page.waitForSelector('a.card-title-link');
      // Scrape job IDs with serial numbers
      const jobLinks = await page.$$eval('a.card-title-link', (links, pageNumber) =>
        links.map((link, index) => ({
          id: link.id, // Extract ID
          serialNumber: (pageNumber - 1) * 20 + index + 1, // Add serial number
          link: link.href,
        })).filter((job) => job.id)
      );
      allJobLinks.push(...jobLinks); // Add page's job links to all links
      await page.close();
    }
    // Construct full job URLs
    const baseURL = 'https://www.dice.com/job-detail/';
    const searchParams = '?searchlink=search%2F%3Fq%3D.net%26countryCode%3DUS%26radius%3D30%26radiusUnit%3Dmi%26page%3D1%26pageSize%3D20%26filters.postedDate%3DTHREE%26filters.employmentType%3DTHIRD_PARTY%26language%3Den';
    const jobLinks = allJobLinks.map((job) => `<span class="math-inline">\{baseURL\}</span>{job.id}${searchParams}`);
    console.log('Constructed job URLs:', jobLinks);

    // Save job links with serial numbers to file
    const joblinksFile = './joblinks.json';
    console.log(`Saving job links with serial numbers to ${joblinksFile}...`);
    await fs.writeFile(joblinksFile, JSON.stringify(jobLinks, null, 2));
    console.log(`Job links saved to ${joblinksFile}.`);

    // Filtered jobs logic
    const filteredJobs = [];
    for (const jobLink of jobLinks) {
      const jobPage = await context.newPage();

      if (jobLink) { // Check if jobLink is not empty
        console.log(`Navigating to job: ${jobLink}`);
        await jobPage.goto(jobLink);

        // Wait for the page to load (3 seconds)
        await jobPage.waitForTimeout(3000);

        const overviewText = await jobPage.$eval(
          '.job-overview_jobDetails__kBakg',
          (overview) => overview.textContent
        ).catch(() => {
          console.log('Overview section not found.');
          return null;
        });

        if (overviewText && overviewText.includes('Accepts corp to corp applications')) {
          console.log('Accepts corp to corp applications found.');

          // Extract job details
          const jobDetailsText = await jobPage.$eval(
            '.job-details_jobDetails___c7LA',
            (details) => details.textContent
          ).catch(() => {
            console.log('Job details section not found.');
            return null;
          });

          if (jobDetailsText) {
            const requiredExperienceMatch = jobDetailsText.match(/Minimum (\d+) years/);
            
            const requiredExperience = requiredExperienceMatch ? parseInt(requiredExperienceMatch[1], 10) : null;

            if (requiredExperience === null || requiredExperience <= 7) {
              console.log('Job meets filter criteria. Adding to filtered jobs.');

              // Determine resume file based on job description
              let resumeFile;
              if (jobDetailsText.includes('angular')) {
                resumeFile = 'Venkata Sai Ganesh Chadalawada_.NetCA.docx';
              } else if (jobDetailsText.includes('react')) {
                resumeFile = 'Ganesh Chadalawada_.NetCR.docx';
              } else if (jobDetailsText.includes('API-DEV')) {
                resumeFile = 'Venkata Sai Ganesh Chadalawada_.NetAPIDev.docx';
              } else if (jobDetailsText.includes('Blazor')) {
                resumeFile = 'Venkata_Sai_Sr_NetFullStackBDev.docx';
              } else if (jobDetailsText.includes('Mobile Developer') || jobDetailsText.includes('MAUI')) {
                resumeFile = 'Venkata Sai Ganesh Chadalawada_.NetUI.docx';
              } else {
                resumeFile = 'Venkata Sai_.Sr.NetFullStack.docx';
              }

              try {
                // Find and click the "Easy Apply" button
                const easyApplyButton = await jobPage.$('button[data-automation="easy-apply"]'); 
                if (easyApplyButton) {
                  await easyApplyButton.click();
                } else {
                  console.error('Easy Apply button not found.');
                  continue; // Skip to the next job
                }

                // Find and click the "Replace" button (or alternative)
                const replaceButton = await jobPage.$('button[data-v-9fe70a02="" class="file-remove"]'); 
                if (replaceButton) {
                  await replaceButton.click();
                } else {
                  console.error('Replace button not found.');
                  continue; // Skip to the next job
                }

                // Wait for "Select Files to Upload" input
                await jobPage.waitForSelector('input[type="file"]'); 

                // Construct the full path to the resume file
                const resumePath = path.join('C:\\Users\\ganes\Desktop\Resumes', resumeFile);

                // Upload the resume
                await jobPage.setInputFiles('input[type="file"]', [resumePath]); 

                // Click "Upload" button
                await jobPage.click('button[data-automation="resume-upload"]'); 

                // Wait for upload to complete (adjust timeout as needed)
                await jobPage.waitForTimeout(500); 

                // Click "Next" buttons
                while (true) {
                  try {
                    const nextButtonSelector = 'button[data-automation="next"]';
                    await jobPage.waitForSelector(nextButtonSelector);
                    await jobPage.click(nextButtonSelector);
                  } catch (error) {
                    break; // Exit the loop if "Next" button is not found
                  }
                }

                // Click "Submit" button
                try {
                  const submitButtonSelector = 'button[data-automation="submit"]';
                  await jobPage.waitForSelector(submitButtonSelector);
                  await jobPage.click(submitButtonSelector);
                } catch (error) {
                  console.error('Submit button not found.');
                }

              } catch (error) {
                console.error('Error during application process:', error);
              }
            } else {
              console.log('Job does not meet experience criteria.');
            }
          }
        } else {
          console.log('Accepts corp to corp applications not found.');
        }

        await jobPage.close();
      }
    }

    // Save filtered jobs to a file
    const filteredFilePath = './filtered_jobs.json';
    console.log(`Saving filtered jobs to ${filteredFilePath}...`);
    await fs.writeFile(filteredFilePath, JSON.stringify(filteredJobs, null, 2));
    console.log(`Filtered jobs saved to ${filteredFilePath}.`);

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }
})();