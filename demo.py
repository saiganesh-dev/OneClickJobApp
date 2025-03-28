from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# Replace with your actual credentials
email = "saiganesh6323@gmail.com"
password = "Lakshy@2025"

# Configure your browser (e.g., Chrome)
options = webdriver.EdgeOptions()
# options.add_argument("--headless")  # Uncomment for headless mode (if needed)
driver = webdriver.Edge(options=options)
options.add_argument("--log-level=3")  # This sets the log level to warning or higher.
options.add_argument("--disable-extensions")
options.add_argument('--disable-gpu')
options.add_argument("--headless")
options.add_argument('--no-sandbox')

try:
    # Navigate to the Dice login page
    print("Navigating to Dice login page...")
    driver.get("https://www.dice.com/signin")

    # Find and enter email
    print("Waiting for email field...")
    email_field = WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.ID, "email"))
    )
    email_field.send_keys(email)
    print("Email entered.")

    # Click the "Continue" button
    print("Clicking Continue button...")
    continue_button = WebDriverWait(driver, 20).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Continue')]"))
    )
    continue_button.click()

    # Find and enter password
    print("Waiting for password field...")
    password_field = WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.ID, "password"))
    )
    password_field.send_keys(password)
    print("Password entered.")

    # Click the login button
    print("Clicking Sign In button...")
    login_button = WebDriverWait(driver, 20).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Sign In')]"))
    )
    login_button.click()
    print("Sign In clicked.")

    # Wait for the page to load after login
    print("Waiting for login to complete...")
    time.sleep(5)

    # Add scraping logic here...

except Exception as e:
    print(f"An error occurred: {e}")
finally:
    driver.quit()
