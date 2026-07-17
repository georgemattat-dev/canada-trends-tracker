import urllib.request
import xml.etree.ElementTree as ET
import json
import datetime
from bs4 import BeautifulSoup
import traceback

def fetch_html(url):
    """Helper to fetch HTML with a browser-like User Agent"""
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        return response.read()

def scrape_twitter_trends():
    """Scrapes Twitter trends for Canada from trends24.in"""
    print("Scraping Twitter trends from trends24.in...")
    try:
        html = fetch_html("https://trends24.in/canada/")
        soup = BeautifulSoup(html, 'html.parser')
        
        list_containers = soup.find_all('div', class_='list-container')
        if not list_containers:
            print("Warning: No list-container elements found on trends24.in.")
            return []
            
        hourly_trends = []
        # Parse all available hour cards
        for container in list_containers:
            title_el = container.find('h3', class_='title')
            timestamp = "Unknown Time"
            epoch_time = 0.0
            if title_el:
                timestamp = title_el.text.strip()
                # Parse timestamp if present
                try:
                    epoch_time = float(title_el.get('data-timestamp', 0))
                except ValueError:
                    pass
            
            ol_el = container.find('ol', class_='trend-card__list')
            trends = []
            if ol_el:
                for li in ol_el.find_all('li'):
                    link_el = li.find('a', class_='trend-link')
                    if not link_el:
                        continue
                        
                    name = link_el.text.strip()
                    url = link_el.get('href', '')
                    
                    # Tweet count parsing
                    count_el = li.find('span', class_='tweet-count')
                    count_str = ""
                    if count_el:
                        count_str = count_el.text.strip()
                        if not count_str:
                            count_str = count_el.get('data-count', '')
                            
                    trends.append({
                        'name': name,
                        'url': url,
                        'tweet_count': count_str
                    })
                    
            if trends:
                hourly_trends.append({
                    'time': timestamp,
                    'epoch': epoch_time,
                    'trends': trends
                })
                
        print(f"Successfully scraped {len(hourly_trends)} hours of Twitter trends.")
        return hourly_trends
        
    except Exception as e:
        print("Error scraping Twitter trends:")
        traceback.print_exc()
        return []

def parse_google_trends():
    """Scrapes Google trends for Canada from official RSS feed"""
    print("Scraping Google trends from RSS feed...")
    try:
        xml_data = fetch_html("https://trends.google.com/trending/rss?geo=CA")
        root = ET.fromstring(xml_data)
        
        # Google trends uses namespace for approx_traffic, picture, news_items
        ns = {'ht': 'https://trends.google.com/trending/rss'}
        
        channel = root.find('channel')
        if channel is None:
            print("Warning: Google Trends XML 'channel' element not found.")
            return []
            
        items = channel.findall('item')
        google_trends = []
        
        for item in items:
            title = item.find('title')
            keyword = title.text.strip() if (title is not None and title.text is not None) else "N/A"
            
            # Extract traffic
            traffic_el = item.find('{https://trends.google.com/trending/rss}approx_traffic')
            traffic = traffic_el.text.strip() if (traffic_el is not None and traffic_el.text is not None) else "N/A"
            
            # Extract main picture
            picture_el = item.find('{https://trends.google.com/trending/rss}picture')
            picture_url = picture_el.text.strip() if (picture_el is not None and picture_el.text is not None) else ""
            
            picture_source_el = item.find('{https://trends.google.com/trending/rss}picture_source')
            picture_source = picture_source_el.text.strip() if (picture_source_el is not None and picture_source_el.text is not None) else ""
            
            # Extract pubDate
            pub_date_el = item.find('pubDate')
            pub_date = pub_date_el.text.strip() if (pub_date_el is not None and pub_date_el.text is not None) else ""
            
            # Extract news items
            news_items = []
            news_elements = item.findall('{https://trends.google.com/trending/rss}news_item')
            for news in news_elements:
                news_title_el = news.find('{https://trends.google.com/trending/rss}news_item_title')
                news_url_el = news.find('{https://trends.google.com/trending/rss}news_item_url')
                news_source_el = news.find('{https://trends.google.com/trending/rss}news_item_source')
                news_snippet_el = news.find('{https://trends.google.com/trending/rss}news_item_snippet')
                news_pic_el = news.find('{https://trends.google.com/trending/rss}news_item_picture')
                
                news_items.append({
                    'title': news_title_el.text.strip() if (news_title_el is not None and news_title_el.text is not None) else "",
                    'url': news_url_el.text.strip() if (news_url_el is not None and news_url_el.text is not None) else "",
                    'source': news_source_el.text.strip() if (news_source_el is not None and news_source_el.text is not None) else "",
                    'snippet': news_snippet_el.text.strip() if (news_snippet_el is not None and news_snippet_el.text is not None) else "",
                    'picture': news_pic_el.text.strip() if (news_pic_el is not None and news_pic_el.text is not None) else ""
                })
                
            google_trends.append({
                'keyword': keyword,
                'traffic': traffic,
                'picture': picture_url,
                'picture_source': picture_source,
                'pub_date': pub_date,
                'news': news_items
            })
            
        print(f"Successfully scraped {len(google_trends)} Google Search Trends.")
        return google_trends
        
    except Exception as e:
        print("Error scraping Google trends:")
        traceback.print_exc()
        return []

def scrape_youtube_trends():
    """Scrapes YouTube trending videos in Canada from Kworb.net"""
    print("Scraping YouTube trends from Kworb.net...")
    try:
        html = fetch_html("https://kworb.net/youtube/trending/ca.html")
        soup = BeautifulSoup(html, 'html.parser')
        
        tables = soup.find_all('table')
        if not tables:
            print("Warning: No table element found on Kworb.")
            return []
            
        trend_table = tables[0]
        rows = trend_table.find_all('tr')
        
        youtube_trends = []
        for row in rows[1:]: # Skip headers
            cols = row.find_all('td')
            if len(cols) < 3:
                continue
                
            rank = cols[0].text.strip()
            status = cols[1].text.strip()
            
            link_el = cols[2].find('a')
            if not link_el:
                continue
                
            title = link_el.text.strip()
            url = link_el.get('href', '')
            
            # Extract video ID from share link (usually https://youtu.be/VIDEO_ID)
            video_id = ""
            if 'youtu.be/' in url:
                video_id = url.split('youtu.be/')[-1].split('?')[0]
            elif 'youtube.com/watch' in url:
                # Fallback if URL is standard watch link
                try:
                    video_id = url.split('v=')[-1].split('&')[0]
                except IndexError:
                    pass
            
            youtube_trends.append({
                'rank': rank,
                'status': status,
                'title': title,
                'url': url,
                'video_id': video_id
            })
            
        print(f"Successfully scraped {len(youtube_trends)} YouTube Trends from Kworb.")
        return youtube_trends
        
    except Exception as e:
        print("Error scraping YouTube trends:")
        traceback.print_exc()
        return []

def main():
    start_time = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %I:%M:%S %p %Z")
    print(f"Canada Trends Tracker Scraper starting at {start_time}")
    
    twitter_data = scrape_twitter_trends()
    google_data = parse_google_trends()
    youtube_data = scrape_youtube_trends()
    
    # Compile everything
    consolidated_data = {
        'last_updated': start_time,
        'timestamp': datetime.datetime.now().timestamp(),
        'twitter': twitter_data,
        'google': google_data,
        'youtube': youtube_data
    }
    
    # Write to data.json
    output_path = "data.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(consolidated_data, f, indent=2, ensure_ascii=False)
        
    print(f"Scraper finished! Data exported to {output_path}")

if __name__ == "__main__":
    main()
