// Import DOMParser for Node.js (will be installed via npm)
const { DOMParser } = require('xmldom');

(async () => {
    
    
    // 📺 Add all your YouTube channel RSS feed URLs here
    const GOOGLE_NEWS_FEEDS = [
        {"feedname":"bengaluru","url":"https://news.google.com/rss/headlines/section/geo/Bengaluru?hl=en-IN&gl=IN&ceid=IN:en"}, 
        /*{"feedname":"some other city","url":"https://www.youtube.com/feeds/videos.xml?channel_id=UCco04pGIpOtfHePXG5MnB9g"}*/
    ];
    
    const NTFY_URL = process.env.NTFY_URL; 
    let totalSentCount = 0; 

    // Loop through each channel feed URL
    for (const feed of GOOGLE_NEWS_FEEDS) {
        

        try {
            const response = await fetch(feed.url);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);          
           
            const rawText = await response.text();
			console.log("✅ Feed retrieved! Parsing item blocks...");
           
			const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rawText, "text/xml");
            
           
            
			const itemsArray = Array.from(xmlDoc.getElementsByTagName("item")).map(item => {
				return {
					title: item.getElementsByTagName('title')[0]?.textContent || '',
					link: item.getElementsByTagName('link')[0]?.textContent || '',
					guid: item.getElementsByTagName('guid')[0]?.textContent || '',
					pubDate: item.getElementsByTagName('pubDate')[0]?.textContent || '',
					description: item.getElementsByTagName('description')[0]?.textContent || '',
					source: item.getElementsByTagName('source')[0]?.textContent || ''
				};
			});
			
			 // Take the top 10 latest feeds from this list and reverse it so that in the latest ntfy the latest comes on top
			itemsArray.sort((a, b) => {
				return new Date(b.pubDate) - new Date(a.pubDate);
			});
			
			const entries = itemsArray.slice(0, 10).reverse();
			
            for (const entry of entries) {
                // 1. link href
              
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

                console.log(published)
                const bodyText = `📅 Uploaded: ${new Date(published).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}\n\n📝 Title:\n${title}\n\n📝 Source:\n${source}\n\n🎬 Click here: ${linkHref}`;
                console.log(bodyText)
                // Send to ntfy

                 // Send to ntfy
                 const ntfyRes = await fetch(NTFY_URL, {
                  method: 'POST',
                  headers: {
                      'Title': source,
                      'Content-Type': 'text/plain',
                      //'Attach': mediaThumbnail
                  },
                  body: bodyText
              });

              if (ntfyRes.ok) {
                  totalSentCount++;
                  console.log(`Sent: ${feed.feedname}`);
              } else {
                  console.error(`Failed to send notification for: ${feed.feedname}`);
              }
              await new Promise(resolve => setTimeout(resolve, 1000));  // Wait for 1 second (1000 milliseconds) before moving to the next item   
            }

        } catch (error) {
            console.error(`❌ Failed to process feed ${feed.feedname}:`, error.message);
        }
    }

    console.log(`\n🎉 Process complete! Total notifications sent: ${totalSentCount}`);
})();
