const fs = require('fs');
const axios = require('axios');
const dayjs = require('dayjs');

const status = JSON.parse(fs.readFileSync('data/status.json'));
const time = dayjs().format('YYYY-MM-DD');

function getSha256Hash() {
  console.log('Getting Sha256Hash...');
  return axios.get('https://www.epicgames.com/store/zh-CN/browse?sortBy=releaseDate&sortDir=DESC&count=1')
    .then((response) => response.data?.match(/\["withPromotions",null\],"([\w\w]+?)"]/)?.[1])
    .catch(() => null);
}

function getReleasedGamesTotal(sha256Hash) {
  console.log('Getting ReleasedGames Total...');
  return axios.get(`https://www.epicgames.com/graphql?operationName=searchStoreQuery&variables=%7B%22category%22:%22games%2Fedition%2Fbase%7Csoftware%2Fedition%2Fbase%7Ceditors%7Cbundles%2Fgames%7Caddons%7Cgames%2Fdemo%22,%22comingSoon%22:false,%22count%22:1,%22country%22:%22CN%22,%22keywords%22:%22%22,%22locale%22:%22zh-CN%22,%22sortBy%22:%22releaseDate%22,%22sortDir%22:%22DESC%22,%22tag%22:%22%22,%22withPrice%22:false%7D&extensions=%7B%22persistedQuery%22:%7B%22version%22:1,%22sha256Hash%22:%22${sha256Hash}%22%7D%7D`) // eslint-disable-line
    .then((response) => response.data?.data?.Catalog?.searchStore?.paging?.total)
    .catch(() => null);
}
async function getReleasedGames(sha256Hash, total, start = 0) {
  total = total || await getReleasedGamesTotal(sha256Hash); // eslint-disable-line
  if (!total) throw 'Get released games total failed';
  if (status.releasedGames.total === total) {
    return console.log(`[${time}] No new released games!`);
  }
  const count = start + 100;
  console.log(`Getting Released Games...[${count > total ? total : count} / ${total}]`);
  const games = await axios.get(`https://www.epicgames.com/graphql?operationName=searchStoreQuery&variables=%7B%22category%22:%22games%2Fedition%2Fbase%7Csoftware%2Fedition%2Fbase%7Ceditors%7Cbundles%2Fgames%7Caddons%7Cgames%2Fdemo%22,%22comingSoon%22:false,%22count%22:100,%22country%22:%22CN%22,%22keywords%22:%22%22,%22locale%22:%22zh-CN%22,%22sortBy%22:%22releaseDate%22,%22sortDir%22:%22DESC%22,%22start%22:${start},%22tag%22:%22%22,%22withPrice%22:false%7D&extensions=%7B%22persistedQuery%22:%7B%22version%22:1,%22sha256Hash%22:%22${sha256Hash}%22%7D%7D`) // eslint-disable-line
    .then((response) => response.data?.data?.Catalog?.searchStore?.elements?.map(({ title, id, namespace, offerMappings, urlSlug, categories, customAttributes }) => ({ name: title, offerId: id, namespace, pageSlug: [...new Set([offerMappings?.[0]?.pageSlug, urlSlug, customAttributes.find(e => e.key === 'com.epicgames.app.productSlug')?.value?.replace(/\/home$/, '')].filter(e => e))], type: categories?.[0]?.path }))) // eslint-disable-line
    .catch(() => []);

  if (count >= total) {
    fs.writeFileSync(`data/releasedGames-${time}.json`, JSON.stringify(games));
    status.releasedGames.updateTime = time;
    status.releasedGames.total = total;
    fs.writeFileSync('data/status.json', JSON.stringify(status, null, 4));
    return true;
  }
  fs.writeFileSync(`data/releasedGames-archived-${count}.json`, JSON.stringify(games));
  status.releasedGames.archived = count;
  status.releasedGames.total = count;
  status.releasedGames.updateTime = time;
  fs.writeFileSync('data/status.json', JSON.stringify(status, null, 4));
  return await getReleasedGames(sha256Hash, total, count);
}

function getComingsoonGamesTotal(sha256Hash) {
  console.log('Getting ComingsoonGames Total...');
  return axios.get(`https://www.epicgames.com/graphql?operationName=searchStoreQuery&variables=%7B%22category%22:%22games%2Fedition%2Fbase%7Csoftware%2Fedition%2Fbase%7Ceditors%7Cbundles%2Fgames%7Caddons%7Cgames%2Fdemo%22,%22comingSoon%22:true,%22count%22:1,%22country%22:%22CN%22,%22keywords%22:%22%22,%22locale%22:%22zh-CN%22,%22sortBy%22:%22releaseDate%22,%22sortDir%22:%22ASC%22,%22tag%22:%22%22,%22withPrice%22:false%7D&extensions=%7B%22persistedQuery%22:%7B%22version%22:1,%22sha256Hash%22:%22${sha256Hash}%22%7D%7D`) // eslint-disable-line
    .then((response) => response.data?.data?.Catalog?.searchStore?.paging?.total)
    .catch((error) => { throw error; });
}
async function getComingsoonGames(sha256Hash) {
  const total = await getComingsoonGamesTotal(sha256Hash); // eslint-disable-line
  if (!total) throw 'Get comingsoon games total failed';
  if (status.comingsoonGames.total === total) {
    return console.log(`[${time}] No new comingsoon games!`);
  }
  console.log('Getting Comingsoon Games...');
  const games = await axios.get(`https://www.epicgames.com/graphql?operationName=searchStoreQuery&variables=%7B%22category%22:%22games%2Fedition%2Fbase%7Csoftware%2Fedition%2Fbase%7Ceditors%7Cbundles%2Fgames%7Caddons%7Cgames%2Fdemo%22,%22comingSoon%22:true,%22count%22:${total},%22country%22:%22CN%22,%22keywords%22:%22%22,%22locale%22:%22zh-CN%22,%22sortBy%22:%22releaseDate%22,%22sortDir%22:%22ASC%22,%22tag%22:%22%22,%22withPrice%22:false%7D&extensions=%7B%22persistedQuery%22:%7B%22version%22:1,%22sha256Hash%22:%22${sha256Hash}%22%7D%7D`) // eslint-disable-line
    .then((response) => response.data?.data?.Catalog?.searchStore?.elements?.map(({ title, id, namespace, offerMappings, urlSlug, categories, customAttributes }) => ({ name: title, offerId: id, namespace, pageSlug: [...new Set([offerMappings?.[0]?.pageSlug, urlSlug, customAttributes?.find(e => e.key === 'com.epicgames.app.productSlug')?.value?.replace(/\/home$/, '')].filter(e => e))], type: categories?.[0]?.path }))) // eslint-disable-line
    .catch((error) => { throw error; });
  if (games.length > 0) {
    fs.writeFileSync(`data/comingsoonGames-${dayjs().format('YYYY-MM-DD')}.json`, JSON.stringify(games));
    status.comingsoonGames.total = games.length;
    status.comingsoonGames.updateTime = time;
    fs.writeFileSync('data/status.json', JSON.stringify(status, null, 4));
  }
}
function getFreeGamesTotal(sha256Hash) {
  console.log('Getting FreeGames Total...');
  return axios.get(`https://www.epicgames.com/graphql?operationName=searchStoreQuery&variables=%7B%22category%22:%22games%2Fedition%2Fbase%7Csoftware%2Fedition%2Fbase%7Ceditors%7Cbundles%2Fgames%7Caddons%7Cgames%2Fdemo%22,%22comingSoon%22:false,%22count%22:1,%22country%22:%22CN%22,%22keywords%22:%22%22,%22freeGame%22:true,%22locale%22:%22zh-CN%22,%22sortBy%22:%22releaseDate%22,%22sortDir%22:%22ASC%22,%22tag%22:%22%22,%22withPrice%22:false%7D&extensions=%7B%22persistedQuery%22:%7B%22version%22:1,%22sha256Hash%22:%22${sha256Hash}%22%7D%7D`) // eslint-disable-line
    .then((response) => response.data?.data?.Catalog?.searchStore?.paging?.total)
    .catch((error) => { throw error; });
}
async function getFreeGames(sha256Hash) {
  const total = await getFreeGamesTotal(sha256Hash); // eslint-disable-line
  if (!total) throw 'Get free games total failed';
  console.log('Getting Free Games...');
  const freeGames = await axios.get(`https://www.epicgames.com/graphql?operationName=searchStoreQuery&variables=%7B%22category%22:%22games%2Fedition%2Fbase%7Csoftware%2Fedition%2Fbase%7Ceditors%7Cbundles%2Fgames%7Caddons%7Cgames%2Fdemo%22,%22comingSoon%22:false,%22count%22:${total},%22country%22:%22CN%22,%22keywords%22:%22%22,%22freeGame%22:true,%22locale%22:%22zh-CN%22,%22sortBy%22:%22releaseDate%22,%22sortDir%22:%22ASC%22,%22tag%22:%22%22,%22withPrice%22:false%7D&extensions=%7B%22persistedQuery%22:%7B%22version%22:1,%22sha256Hash%22:%22${sha256Hash}%22%7D%7D`) // eslint-disable-line
    .then((response) => response.data?.data?.Catalog?.searchStore?.elements?.map(({ title, id, namespace, offerMappings, urlSlug, categories, customAttributes }) => ({ name: title, offerId: id, namespace, pageSlug: [...new Set([offerMappings?.[0]?.pageSlug, urlSlug, customAttributes?.find(e => e.key === 'com.epicgames.app.productSlug')?.value?.replace(/\/home$/, '')].filter(e => e))], type: categories?.[0]?.path }))) // eslint-disable-line
    .catch((error) => { throw error; });
  const games = [...freeGames, ...await freeGamesPromotions()];
  if (games.length > 0) {
    fs.writeFileSync(`data/freeGames-${dayjs().format('YYYY-MM-DD')}.json`, JSON.stringify(games));
    status.freeGames.updateTime = time;
    fs.writeFileSync('data/status.json', JSON.stringify(status, null, 4));
  }
}
function freeGamesPromotions() {
  console.log('Getting Free Games Promotions...');
  return axios.get(`https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=zh-CN&country=CN&allowCountries=CN`) // eslint-disable-line
    .then((response) => response.data?.data?.Catalog?.searchStore?.elements?.filter(({ promotions }) => promotions)
      .map(({ title, id, namespace, offerMappings, urlSlug, categories, customAttributes, promotions }) => {
        const { startDate, endDate } = [
          ...(promotions?.promotionalOffers || []),
          ...(promotions?.upcomingPromotionalOffers || [])
        ]?.[0]?.promotionalOffers?.[0] || {};
        return {
          name: title,
          offerId: id,
          namespace,
          pageSlug: [...new Set([offerMappings?.[0]?.pageSlug, urlSlug, customAttributes?.find((e) => e.key === 'com.epicgames.app.productSlug')?.value?.replace(/\/home$/, '')].filter((e) => e))], // eslint-disable-line
          type: categories?.[0]?.path,
          promotions: { startDate: new Date(startDate).getTime(), endDate: new Date(endDate).getTime() }
        };
      }))
    .catch((error) => { throw error; });
}

(async () => {
  const sha256Hash = await getSha256Hash();
  if (!sha256Hash) throw 'Get sha256Hash failed';

  await getReleasedGames(sha256Hash, null, status.releasedGames.archived);
  await getComingsoonGames(sha256Hash);
  await getFreeGames(sha256Hash);

  // await freeGamesPromotions()
})();
