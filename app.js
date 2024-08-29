const puppeteer = require('puppeteer');
const { Client } = require('pg');
const { Bot } = require('./bot');

const bot = new Bot(
  '6653222116:AAFEQDO0edyRhEdeTflc949yJ9X-lpj_HV0',
  797214937
);

const client = new Client({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: '5432',
  database: 'mev_scrapper',
});

const fetch_info = async (new_page, url) => {
  await new_page.goto(url, {
    waitUntil: 'networkidle2',
  });

  try {
    await new_page.waitForSelector(
      '.mantine-Skeleton-root.mantine-Skeleton-visible.mantine-1ktxnmd',
      { hidden: true, timeout: 5000 }
    );
  } catch (error) {}

  await delay(1000);

  try {
    const transaction_info = await new_page.evaluate(() => {
      const arr = Array.from(
        document.getElementsByTagName('tbody')[0].children
      );

      return arr.map((tr) => {
        return {
          key: tr.childNodes[0].childNodes[0].innerText,
          value: tr.childNodes[1].childNodes[0].innerText,
        };
      });
    });

    await new_page.close();

    return transaction_info;
  } catch (error) {
    bot.sendMessage(`Error in fetching\ntransaction url: ${url}\n${error}`);
    await new_page.close();
  }
};

let browser_listen;
let browser_fetch;

(async () => {
  await client.connect();

  browser_listen = await puppeteer.launch({ headless: false });
  const page = await browser_listen.newPage();

  await page.goto('https://eigenphi.io/mev/ethereum/txr', {
    waitUntil: 'networkidle2',
  });

  await page.waitForSelector('tbody > tr > td > a > div > span > div > div');

  browser_fetch = await puppeteer.launch({ headless: false });

  page.exposeFunction(
    'puppeteer_mutation_listener',
    puppeteer_mutation_listener
  );

  await page.evaluate(() => {
    const target = document.querySelector('tbody');
    const observer = new MutationObserver(async (mutationsList) => {
      const finalArr = mutationsList.reduce((arr, mutation) => {
        let node;
        if (mutation.addedNodes.length > 0) {
          node = {
            href: mutation.addedNodes[0].children[1].childNodes[0].childNodes[0]
              .childNodes[0].href,
            type: 'added',
          };
        } else {
          node = {
            href: mutation.removedNodes[0].children[1].childNodes[0]
              .childNodes[0].childNodes[0].href,
            type: 'removed',
          };
        }

        const index = arr.findIndex(({ href }) => href == node.href);
        if (index !== -1) {
          arr.splice(index, 1);
        } else {
          arr.push(node);
        }
        return arr;
      }, []);

      const newArr = finalArr.filter((el) => {
        return el.type == 'added';
      });

      for (let i = 0; i < newArr.length; i++) {
        const el = newArr[i];
        puppeteer_mutation_listener(el.href);
      }
    });
    observer.observe(target, { childList: true });
  });

  // for (const { tx, block } of transaction_urls) {
  //   const new_page = await browser.newPage();
  //   const transaction_info = await fetch_info(new_page, tx);
  //   console.log(transaction_info);
  // }
})();

async function puppeteer_mutation_listener(link) {
  // console.log(link.split('/').pop());

  const new_page = await browser_fetch.newPage();
  const transaction_info = await fetch_info(new_page, link);

  if (transaction_info) {
    save_in_db(transaction_info);
  }
  // console.log(transaction_info);
  // );
  // console.log(`${oldValue} -> ${newValue}`);
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function save_in_db(transaction_info) {
  // console.log(get_value_by_key(transaction_info, 'Transaction Hash'));
  // console.log(get_value_by_key(transaction_info, 'Profit'));
  // console.log(get_value_by_key(transaction_info, 'Cost'));
  // console.log(get_value_by_key(transaction_info, 'MEV Type'));
  // console.log(get_value_by_key(transaction_info, 'Time'));
  // console.log(get_value_by_key(transaction_info, 'Signal Transaction(beta)'));
  // console.log(get_value_by_key(transaction_info, 'From'));
  // console.log(get_value_by_key(transaction_info, 'Revenue'));
  // console.log(get_value_by_key(transaction_info, 'BlockNumber'));
  // console.log(get_value_by_key(transaction_info, 'Position'));
  // console.log(get_value_by_key(transaction_info, 'Builder'));
  const insert = `INSERT INTO mev_transactions(hash, profit, cost, mev_type, time, signal_transaction, from1, contract, revenue, block_number, position, builder) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
  const values = [
    get_value_by_key(transaction_info, 'Transaction Hash'),
    get_value_by_key(transaction_info, 'Profit'),
    get_value_by_key(transaction_info, 'Cost'),
    get_value_by_key(transaction_info, 'MEV Type'),
    get_value_by_key(transaction_info, 'Time'),
    get_value_by_key(transaction_info, 'Signal Transaction(beta)'),
    get_value_by_key(transaction_info, 'From'),
    get_value_by_key(transaction_info, 'Contract(To)'),
    get_value_by_key(transaction_info, 'Revenue'),
    get_value_by_key(transaction_info, 'BlockNumber'),
    get_value_by_key(transaction_info, 'Position'),
    get_value_by_key(transaction_info, 'Builder'),
  ];
  // const values = ['value1', 'value2'];

  client.query(insert, values, (err, result) => {
    // console.log(result);
    if (err) {
      console.error('Error inserting data', err);
    } else {
      bot.sendMessage(
        `Error in saving in db\ntransaction_hash: ${get_value_by_key(
          transaction_info,
          'Transaction Hash'
        )}`
      );
      console.log('Data inserted successfully');
    }

    // client.end();
  });
}

function get_value_by_key(objects, key) {
  const value = objects.find((e) => e.key == key).value;
  if (value[0] == '$' || value[1] == '$') {
    return value.split('$').join('');
  } else {
    return value;
  }
}
