const { chromium } = require('playwright');
const fs = require('fs/promises');

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
      const pageURL = `${diceURL}&page=${pageNumber}`;
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
    const jobLinks = allJobLinks.map((job) => `${baseURL}${job.id}${searchParams}`);
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
      } else {
        console.log('Skipping empty job link.');
        continue; // Skip to the next iteration
      }
      // Wait for the overview section
      await jobPage.waitForTimeout(2000);

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
            filteredJobs.push({
              serialNumber: jobLink.serialNumber, // Include serial number
              link: jobLink.link,
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