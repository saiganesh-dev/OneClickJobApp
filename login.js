const { chromium } = require('playwright');
const fs = require('fs/promises');

(async () => {
  const browser = await chromium.launch({ headless: false }); // Set to `true` for headless mode
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the login page
    console.log('Navigating to login page...');
    await page.goto('https://dice.com/signin'); // Replace with the actual login URL

    
    // Wait for the email input and enter email
    console.log('Waiting for email input...');
    const emailSelector = 'input[type="email"]';
    await page.waitForSelector(emailSelector);
    console.log('Entering email...');
    await page.fill(emailSelector, 'saiganesh6323@gmail.com'); // Replace with your email

    // Click the submit button
    console.log('Clicking submit button...');
    const submitSelector = 'button[type="submit"]';
    await page.waitForSelector(submitSelector);
    await page.click(submitSelector);

    // Wait for the password input
    console.log('Waiting for password input...');
    const passwordSelector = 'input[type="password"]';
    await page.waitForSelector(passwordSelector);

    // Enter password and sign in
    console.log('Entering password...');
    await page.fill(passwordSelector, 'Lakshy@2025'); // Replace with your password
    const signInSelector = 'button[type="submit"]'; // Adjust if necessary
    console.log('Clicking sign-in button...');
    await page.click(signInSelector);

    // Wait for successful login (you may need to adjust based on your application behavior)
    console.log('Waiting for page to load...');
    await page.waitForTimeout(5000);

 // Navigate to Dice job search page
 const diceURL = 'https://www.dice.com/jobs?q=.net&countryCode=US&radius=30&radiusUnit=mi&page=1&pageSize=20&filters.postedDate=THREE&filters.employmentType=THIRD_PARTY&language=en';
 console.log(`Navigating to ${diceURL}...`);
 await page.goto(diceURL);

 // Wait for job listings to load
    console.log('Waiting for job listings...');
    await page.waitForSelector('a.card-title-link');

    // Scrape job IDs
    console.log('Scraping job IDs...');
    const jobIds = await page.$$eval('a.card-title-link', (links) =>
      links.map((link) => link.id).filter((id) => id) // Extract valid IDs only
    );
    console.log(`Found ${jobIds.length} job IDs:`, jobIds);

    // Construct full job URLs
    const baseURL = 'https://www.dice.com/job-detail/';
    const searchParams = '?searchlink=search%2F%3Fq%3D.net%26countryCode%3DUS%26radius%3D30%26radiusUnit%3Dmi%26page%3D1%26pageSize%3D20%26filters.postedDate%3DTHREE%26filters.employmentType%3DTHIRD_PARTY%26language%3Den';
    const jobLinks = jobIds.map((id) => `${baseURL}${id}${searchParams}`);
    console.log('Constructed job URLs:', jobLinks);

    // Save filtered jobs to a file
    const joblinksFile = './joblinks.json';
    console.log(`Saving  jobs links to ${joblinksFile}...`);
    await fs.writeFile(joblinksFile, JSON.stringify(jobLinks, null, 2));
    console.log(` Job links are saved to ${joblinksFile}.`);
    const filteredJobs = [];

    for (const jobLink of jobLinks) {
      console.log(`Navigating to job: ${jobLink}`);
      const jobPage = await context.newPage();
      await jobPage.goto(jobLink);

      // Wait for the overview section
      console.log('Waiting for overview section...');
      await jobPage.waitForTimeout(2000); // Wait for 2 seconds to ensure elements are loaded
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
        console.log('Checking job details...');
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

          if (requiredExperience ==null  || requiredExperience <= 7) {
            console.log('Job meets filter criteria. Adding to filtered jobs.');
            filteredJobs.push({
              link: jobLink,
              requiredExperience,
              details: jobDetailsText,
            });
          } else {
            console.log('Job does not meet experience criteria.');
          }
        }
      } else {
        console.log('Accepts corp to corp applications not found.');
      }

      await jobPage.close();
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