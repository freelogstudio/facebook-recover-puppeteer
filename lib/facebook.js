"use strict";

const puppeteer = require("puppeteer-extra");
const url = require("url");
const qs = require("querystring");
const lodash = require('lodash');

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const fs = require("fs-extra");
if (process.env.PUPPETEER_ADBLOCKER) puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
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
    const args = process.env.PUPPETEER_PROXY ? [ process.env.PUPPETEER_PROXY ] : [];
    return new this(await puppeteer.launch({ headless: true, args }));
  }
  constructor(browser) {
    this._browser = browser;
  }
  formatResult(v) {
    const split = lodash.uniq(v.split('\n').map((v) => v.trim()).filter(Boolean)).filter((v) => !(v.match(/^(?:Send|How|Facebook)/)));
    return split;
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
    await page.$eval('button[type="submit"]', (el) => el.click());
    await page.waitForSelector('tbody tbody');
    return this.formatResult(await page.$$eval('tbody', (els) => els.map((v) => v.innerText).join('')));
  }
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
