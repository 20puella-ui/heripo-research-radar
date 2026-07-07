import { Resend } from 'resend';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 12px; }
        h1 { color: #ff6b35; border-bottom: 3px solid #ff6b35; padding-bottom: 10px; }
        .article { margin: 20px 0; padding: 15px; border-left: 4px solid #ff6b35; background: #fafafa; }
        .article h3 { margin: 0 0 8px; color: #333; }
        .article p { color: #666; margin: 5px 0; }
        .cta { display: inline-block; background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Energy Weekly | Week 28, 2026</h1>
        <p>안녕하세요 챠에린님, 이번 주 에너지 산업 주요 소식입니다.</p>
        
        <h2>이번 주 TOP 3</h2>
        
        <div class="article">
          <h3>1. OPEC+, 8월 추가 증산 결정</h3>
          <p>7개국이 화상회의를 통해 글로벌 시장 상황을 재검토하고 추가 증산에 합의했습니다.</p>
        </div>
        
        <div class="article">
          <h3>2. BP JERA, 벨기에 해상풍력 지분 확대</h3>
          <p>384MW 규모의 벨기에 해상풍력 프로젝트 인수를 완료했습니다.</p>
        </div>
        
        <div class="article">
          <h3>3. ADNOC, LNG 마케팅 플랫폼 통합</h3>
          <p>2035년까지 연 4,700만 톤 규모의 LNG 마케팅을 목표로 합니다.</p>
        </div>
        
        https://example.com/full-report
        
        <div class="footer">
          Energy Weekly by ChaeRin<br>
          Powered by LLM Newsletter Kit
        </div>
      </div>
    </body>
    </html>
  `;

  const result = await resend.emails.send({
    from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
    to: process.env.TO_EMAIL!,
    subject: 'Energy Weekly | Week 28 - 테스트 발송',
    html: emailHtml,
  });

  console.log('발송 결과:', JSON.stringify(result, null, 2));
}

main().catch(console.error);