"use strict";

const puppeteer = require("puppeteer-extra");
const url = require("url");
const qs = require("querystring");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const fs = require("fs-extra");
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
puppeteer.use(StealthPlugin());
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: "2captcha",
      token: process.env.TWOCAPTCHA_TOKEN,
    },
    visualFeedback: true,
  })
);

exports.FacebookRecover = class FacebookRecover {
  static async initialize() {
    return new this(await puppeteer.launch({ headless: true }));
  }
  constructor(browser) {
    this._browser = browser;
  }
  async beforeHook(page, meta) {
    if (process.env.NODE_ENV === "development") {
      console.error(meta);
//      await page.screenshot({ path: "fv-" + meta + ".png" });
    }
  }
  async screenshot(p) {
    const screen = await this._browser.screenshot();
    await fs.writeFile(p, screen);
  }
  async waitForNavigation(page) {
    await page.waitForTimeout(1000);
  }
  async submitRecaptchasAndWait(page) {
    await this.waitForNavigation(page);
    try {
      await page.click('button[type="submit"]');
      await this.waitForNavigation(page);
    } catch (e) {
      console.error(e);
      console.error("pass");
    }
  }
  async solveCaptchas(page) {
    await page.solveRecaptchas();
    await this.beforeHook(page, "after-solve");
  }
  async openPage(url) {
    const page = await this._browser.newPage();
    await page.goto(url);
    return page;
  }
  async lookupPhone(phone) {
    const page = await this.openPage(
      url.format({
        protocol: "https:",
        hostname: "www.facebook.com",
        pathname: "/login/identify",
      })
    );
    await page.waitForSelector('input#identify_email');
    await page.type('input#identify_email', phone);
    await page.waitForSelector(500);
    await page.click('button[name="did_submit"]');
    await page.waitForSelector('tbody');
    return await page.$$eval('tbody', (els) => els.map((v) => v.innerText).join(''));
  }
	  /*
    await page.waitForSelector('html body > div > div:nth-child(2) > div:nth-child(1) > div > div:nth-child(2) > div > div > form > div > div:nth-child(2) > div > table > tbody tr:nth-child(2) > td:nth-child(2) > input');
    await page.type('html body > div > div:nth-child(2) > div:nth-child(1) > div > div:nth-child(2) > div > div > form > div > div:nth-child(2) > div > table > tbody tr:nth-child(2) > td:nth-child(2) > input', phone);
    try {
      await page.click('*[name="did_submit"]');
    } catch (e) {
      
      await page.waitForSelector('html > body > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div > div > div > form > div > div:nth-child(2) > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > input');
      await page.type('html > body > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div > div > div > form > div > div:nth-child(2) > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > input', phone);
      await page.click('*[name="did_submit"]');
    }
    await page.waitForSelector("html > body > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div > div:nth-child(2) > form > div > div:nth-child(2) > table > tbody > tr > td:nth-child(2) > div > div:nth-child(2)");
    return await page.$eval("html > body > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div > div:nth-child(2) > form > div > div:nth-child(2) > table > tbody > tr > td:nth-child(2) > div > div:nth-child(2)", (v) => v.innerText);
    */

  async close() {
    try {
      await this._browser.close();
    } catch (e) {
      console.error(e);
    }
  }
};

exports.lookupPhone = async ({ phone }) => {
  const fv = await exports.FacebookRecover.initialize();
  const result = await fv.lookupPhone(phone);
  fv.close()
  return result;
};
