import { Resend } from 'resend';
import Parser from 'rss-parser';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);
const parser = new Parser();

// 크롤링 소스 확대! 6개 소스
const sources = [
  { name: 'EIA', url: 'https://www.eia.gov/rss/todayinenergy.xml' },
  { name: 'CleanTechnica', url: 'https://cleantechnica.com/feed/' },
  { name: 'Energy Storage News', url: 'https://www.energy-storage.news/feed/' },
  { name: 'Renewables Now', url: 'https://renewablesnow.com/news/feed/' },
  { name: 'PV Magazine', url: 'https://www.pv-magazine.com/feed/' },
  { name: 'Offshore Wind', url: 'https://www.offshorewind.biz/feed/' },
  { name: 'Reuters Energy', url: 'https://www.reutersagency.com/feed/?best-topics=energy' },
];

interface Article {
  source: string;
  title: string;
  link: string;
  summary: string;
  pubDate: string;
  pubDateObj: Date;
}

async function crawlAll(): Promise<Article[]> {
  const all: Article[] = [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const source of sources) {
    try {
      console.log('크롤링 중: ' + source.name);
      const feed = await parser.parseURL(source.url);

      const items = feed.items
        .map(item => {
          const pubDate = item.pubDate || item.isoDate || '';
          return {
            source: source.name,
            title: (item.title || '').trim(),
            link: (item.link || '').trim(),
            summary: (item.contentSnippet || item.content || '')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 250) + '...',
            pubDate: pubDate,
            pubDateObj: pubDate ? new Date(pubDate) : new Date(0),
          };
        })
        .filter(item => item.pubDateObj >= sevenDaysAgo) // 최근 7일만
        .slice(0, 3); // 소스당 최대 3개

      all.push(...items);
      console.log('  수집: ' + items.length + '개');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('  실패: ' + source.name + ' (' + msg.substring(0, 50) + ')');
    }
  }

  // 최신순 정렬
  return all.sort((a, b) => b.pubDateObj.getTime() - a.pubDateObj.getTime());
}

function buildEmailHtml(articles: Article[]): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  // 소스별 그룹핑
  const bySource: Record<string, Article[]> = {};
  articles.forEach(a => {
    if (!bySource[a.source]) bySource[a.source] = [];
    bySource[a.source].push(a);
  });

  const articlesHtml = articles.map((a, i) => `
    <div style="margin:25px 0;padding:20px;border-left:4px solid #ff6b35;background:#fafafa;border-radius:6px;">
      <div style="display:inline-block;background:#ff6b35;color:white;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;margin-bottom:8px;">${a.source}</div>
      <h3 style="margin:8px 0;color:#333;font-size:16px;line-height:1.4;">${i + 1}. ${a.title}</h3>
      <p style="color:#666;line-height:1.6;margin:10px 0;font-size:14px;">${a.summary}</p>
      ${a.link}-size:13px;margin-top:8px;">원문 보기 →</a>
    </div>
  `).join('');

  const sourceStats = Object.entries(bySource)
    .map(([source, items]) => `<li style="margin:4px 0;">${source}: ${items.length}건</li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:white;padding:35px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <div style="text-align:center;margin-bottom:25px;">
      <h1 style="color:#ff6b35;font-size:28px;margin:0;">⚡ Energy Weekly</h1>
      <p style="color:#999;font-size:13px;margin:8px 0 0;">${dateStr}</p>
    </div>
    
    <div style="background:#fff8f4;padding:15px 20px;border-radius:8px;margin:20px 0;">
      <p style="margin:0;color:#333;font-size:14px;">
        안녕하세요 <strong>챠에린님</strong>, 이번 주 에너지 산업 주요 소식 <strong>${articles.length}건</strong>을 전해드립니다.
      </p>
      <div style="margin-top:10px;color:#666;font-size:12px;">
        <strong>소스별 수집:</strong>
        <ul style="margin:5px 0;padding-left:20px;">${sourceStats}</ul>
      </div>
    </div>

    ${articlesHtml}

    <div style="text-align:center;color:#999;font-size:12px;margin-top:35px;padding-top:20px;border-top:1px solid #eee;">
      <p style="margin:0;">Energy Weekly by ChaeRin</p>
      <p style="margin:5px 0 0;">자동 생성된 주간 뉴스레터 · Powered by RSS Feeds</p>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('=== Energy Weekly 발송 시작 ===\n');
  const articles = await crawlAll();
  console.log(`\n총 ${articles.length}개 기사 수집 (최근 7일)\n`);

  if (articles.length === 0) {
    console.error('수집된 기사가 없습니다!');
    return;
  }

  const html = buildEmailHtml(articles);
  console.log('이메일 발송 중...');

  const result = await resend.emails.send({
    from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
    to: process.env.TO_EMAIL!,
    subject: `⚡ Energy Weekly - ${articles.length}개 뉴스`,
    html: html,
  });

  console.log('\n✅ 발송 완료!');
  console.log('결과:', JSON.stringify(result, null, 2));
}

main().catch(console.error);