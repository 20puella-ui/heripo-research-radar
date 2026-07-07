import { Resend } from 'resend';
import Parser from 'rss-parser';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);
const parser = new Parser();

const sources = [
  { name: 'EIA', url: 'https://www.eia.gov/rss/todayinenergy.xml' },
  { name: 'CleanTechnica', url: 'https://cleantechnica.com/feed/' },
  { name: 'Energy Storage News', url: 'https://www.energy-storage.news/feed/' },
];

interface Article {
  source: string;
  title: string;
  link: string;
  summary: string;
  pubDate: string;
}

async function crawlAll(): Promise<Article[]> {
  const all: Article[] = [];
  for (const source of sources) {
    try {
      console.log('크롤링 중: ' + source.name);
      const feed = await parser.parseURL(source.url);
      const items = feed.items.slice(0, 3).map(item => ({
        source: source.name,
        title: item.title || '',
        link: item.link || '',
        summary: (item.contentSnippet || item.content || '').substring(0, 200) + '...',
        pubDate: item.pubDate || '',
      }));
      all.push(...items);
      console.log('  수집: ' + items.length + '개');
    } catch (err) {
      console.error('  실패: ' + source.name);
    }
  }
  return all;
}

function buildEmailHtml(articles: Article[]): string {
  const today = new Date();
  const articlesHtml = articles.map((a, i) => 
    '<div style="margin:25px 0;padding:20px;border-left:4px solid #ff6b35;background:#fafafa;border-radius:6px;">' +
    '<div style="display:inline-block;background:#ff6b35;color:white;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;">' + a.source + '</div>' +
    '<h3 style="margin:8px 0;color:#333;font-size:16px;">' + (i + 1) + '. ' + a.title + '</h3>' +
    '<p style="color:#666;line-height:1.6;margin:10px 0;font-size:14px;">' + a.summary + '</p>' +
    '' + a.link + '원문 보기 →</a>' +
    '</div>'
  ).join('');

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
    '<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">' +
    '<div style="background:white;padding:30px;border-radius:12px;">' +
    '<h1 style="color:#ff6b35;border-bottom:3px solid #ff6b35;padding-bottom:10px;">Energy Weekly</h1>' +
    '<p style="color:#666;margin:20px 0;">안녕하세요 챠에린님, 이번 주 에너지 산업 주요 소식 ' + articles.length + '건입니다.</p>' +
    articlesHtml +
    '<div style="text-align:center;color:#999;font-size:12px;margin-top:30px;padding-top:20px;border-top:1px solid #eee;">Energy Weekly by ChaeRin</div>' +
    '</div></body></html>';
}

async function main() {
  console.log('=== Energy Weekly 발송 시작 ===');
  const articles = await crawlAll();
  console.log('총 ' + articles.length + '개 기사 수집 완료');
  
  if (articles.length === 0) {
    console.error('수집된 기사가 없습니다!');
    return;
  }
  
  const html = buildEmailHtml(articles);
  console.log('이메일 발송 중...');
  
  const result = await resend.emails.send({
    from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
    to: process.env.TO_EMAIL!,
    subject: 'Energy Weekly - ' + articles.length + '개 뉴스',
    html: html,
  });
  
  console.log('발송 완료!');
  console.log('결과:', JSON.stringify(result, null, 2));
}

main().catch(console.error);