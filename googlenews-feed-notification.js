import "dotenv/config"; // 👈 MUST BE ON LINE 1 (For ES Modules)
// Import DOMParser for Node.js (will be installed via npm)
import { DOMParser } from "xmldom";

(async () => {
  const triggerType = process.env.RUN_TRIGGER;
  const cronExpression = process.env.SCHEDULE_CRON;
  const dispatchAction = process.env.DISPATCH_ACTION;
  const NTFY_URL = process.env.NTFY_URL;

  // 📺 Add all your YouTube channel RSS feed URLs here
  const NEWS_FEEDS = [
    /* {"feedname":"bengaluru geo","url":"https://news.google.com/rss/headlines/section/geo/Bengaluru?hl=en-IN&gl=IN&ceid=IN:en"}, */
    {
      feedname: "bengaluru news search 1d",
      feedtitle: "Google News",
      url: "https://news.google.com/rss/search?q=Bengaluru+-facebook+-instagram+-bookmyshow+-jobs+-careers+-hiring+-openings+-recruitment+-real+-estate+-property+-apartment+-housing+-zigwheels+-site:x.com+-site:skybet.com+when:1d&hl=en-IN&gl=IN&ceid=IN:en",
    },
    {
      feedname: "The Ken news",
      feedtitle: "THE KEN",
      url: "https://the-ken.com/feed/",
    },
  ];

  let totalSentCount = 0;
  console.log(triggerType);
  // Loop through each channel feed URL
  for (const feed of NEWS_FEEDS) {
    try {
      const response = await fetch(feed.url);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const rawText = await response.text();
      console.log("✅ Feed retrieved! Parsing item blocks...");

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rawText, "text/xml");

      if (feed.feedtitle == "Google News") {
        const itemsArray = Array.from(xmlDoc.getElementsByTagName("item")).map(
          (item) => {
            return {
              title: item.getElementsByTagName("title")[0]?.textContent || "",
              link: item.getElementsByTagName("link")[0]?.textContent || "",
              guid: item.getElementsByTagName("guid")[0]?.textContent || "",
              pubDate: item.getElementsByTagName("pubDate")[0]?.textContent || "",
              description: item.getElementsByTagName("description")[0]?.textContent || "",
              source: item.getElementsByTagName("source")[0]?.textContent || "",
            };
          },
        );

        // Take the top 10 latest feeds from this list and reverse it so that in the latest ntfy the latest comes on top
        itemsArray.sort((a, b) => {
          return new Date(b.pubDate) - new Date(a.pubDate);
        });
        var totalEntires = 12;
        const entries = itemsArray.slice(0, totalEntires);
        let entriesLength = entries.length; // will decrement ass set to --

        let contentList = [],
          contentBatch = ""; // 3 feeds in one ntfy post
        let feedIndex = 0;
        for (const entry of entries) {
          // 1. link href
          let notifIndex = ++feedIndex; // it should go in reverse so that in ntfy the top most notif has the first index

          //const linkElement = entry.getElementsByTagName("link")[0];
          //const linkHref = linkElement ? linkElement.textContent : "";;

          const linkHref = entry.link;

          // 2. published date
          //const publishedElement = entry.getElementsByTagName("pubDate")[0];
          //const published = publishedElement ? publishedElement.textContent : "";
          const published = entry.pubDate;

          // 3. title
          //const titleElement = entry.getElementsByTagName("title")[0];
          //const title = titleElement ? titleElement.textContent : "";
          const title = entry.title;

          // 4. media:thumbnail
          //const thumbnailElement = entry.getElementsByTagName("media:thumbnail")[0];
          //const mediaThumbnail = thumbnailElement ? thumbnailElement.getAttribute("url") : "";

          // 5. media:description
          //const descriptionElement = entry.getElementsByTagName("description")[0];
          //const description = descriptionElement ? descriptionElement.textContent : "";
          const description = entry.description;

          //const sourceElement = entry.getElementsByTagName("source")[0];
          //const source = sourceElement ? sourceElement.textContent : "";
          const source = entry.source;

          const bodyTextFull = `📅 Uploaded: ${new Date(published).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}\n\n📝 Title:\n${title}\n\n📖 Source:\u00A0\ ${source}\n\n 🔗 Click here:\n${linkHref}\n\n `;
          //console.log(bodyTextFull)

          //const shortLink = await shortenUrl(linkHref);
          const googleSearchLink = `https://www.google.com/search?q=${encodeURIComponent(title)}`;
          const bodyText = `\n **${notifIndex}.** ${source} - ${new Date(published).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", timeStyle: "short" })}\n ${title}   [ | link | ](${googleSearchLink})\n`;

          contentBatch += bodyText;

          if (feedIndex % 5 == 0) {
            contentList.push(contentBatch);
            contentBatch = "";
          } else if (entries.length == feedIndex) {
            contentList.push(contentBatch);
          }
        }
        //console.log(" contentList ",...contentList);
        if (contentList.length) {
          let contentListReverse = contentList.reverse(); // so that the numbering in ntfy page is correct
          for (const contentBatch of contentListReverse) {
            //console.log(contentBatch)
            await sendNTFY(feed.feedtitle, undefined, contentBatch);
          }
        }
      } else {
        console.log("Inside Else");
        const itemsArray = Array.from(xmlDoc.getElementsByTagName("item")).map(
          (item) => {
            return {
              title: item.getElementsByTagName("title")[0]?.textContent || "",
              link: item.getElementsByTagName("link")[0]?.textContent || "",
              pubDate: item.getElementsByTagName("pubDate")[0]?.textContent || "",
            };
          },
        );

        const todayString = new Date().toLocaleDateString("en-IN", {timeZone: "Asia/Kolkata",});
        const todaysItems = itemsArray.filter((item) => {
          const itemDateString = new Date(item.pubDate).toLocaleDateString(
            "en-IN",  { timeZone: "Asia/Kolkata" },
          );
          return itemDateString === todayString;
        });
        let feedIndex = 0;
        for (const item of todaysItems) {
          let feedContent = `\n **${todaysItems.length - feedIndex++}.** ${feed.feedtitle} - ${new Date(item.pubDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}\n ${item.title}   [ | link | ](${item.link})\n`;
          await sendNTFY(feed.feedtitle, undefined, feedContent);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to process feed ${feed.feedname}:`, error.stack);
    }
  }
  async function shortenUrl(longUrl) {
    try {
      // Encode the long URL to safely pass it as a query parameter
      const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        console.error(`HTTP error! Status: ${response.status}`);
      }

      const shortUrl = await response.text();
      return shortUrl;
    } catch (error) {
      console.error("Error shortening URL:", error.stack);
      return ""; // Fallback to original URL on failure
    }
  }

  async function sendNTFY(title, mediaThumbnail, body) {
    const payloadSize = Buffer.byteLength(body, "utf8");
    console.log(`Current body size: ${payloadSize} bytes`);
    console.log(body);
    let ntfyHeaders = {
      Title: title,
      "Content-Type": "text/plain",
      Markdown: "yes",
    };
    if (mediaThumbnail) {
      ntfyHeaders["Attach"] = mediaThumbnail;
    }
    /*const ntfyHeaders = new Headers();

        // 2. Append the required ntfy custom headers
        ntfyHeaders.append("Title", title);
        ntfyHeaders.append("X-Markdown", "yes"); // Use X-Markdown to prevent proxy stripping
        ntfyHeaders.append("Markdown", "yes");   // Backup flag for native ntfy parsing

        if (mediaThumbnail) {
            ntfyHeaders.append("Attach", mediaThumbnail);
        }

        const rawBodyBytes = new TextEncoder().encode(body);*/

    const ntfyRes = await fetch(NTFY_URL, {
      method: "POST",
      headers: ntfyHeaders,
      body: body,
    });

    if (ntfyRes.ok) {
      totalSentCount++;
      console.log(`Sent to NTFY: ${title}`);
    } else {
      const errorText = await ntfyRes.text();
      console.error(
        `NTFY error for ${title}, (${ntfyRes.status}): ${errorText}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second (1000 milliseconds) before moving to the next item
  }

  console.log(
    `\n🎉 Process complete! Total notifications sent: ${totalSentCount}`,
  );
})();
