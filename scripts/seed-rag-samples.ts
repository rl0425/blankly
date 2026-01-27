/**
 * RAG 샘플 시딩 스크립트
 * 
 * 실행: npm run seed:rag
 * 
 * 기능:
 * - samples/ 디렉토리의 JSON 파일들을 Supabase DB에 업로드
 * - 임베딩 자동 생성
 * - 계층 구조 순회
 */

import fs from 'fs';
import path from 'path';
import { bulkStoreSamples } from '../shared/lib/rag/embeddings';
import { TECH_HIERARCHY } from '../shared/lib/rag/hierarchy';

async function seedRAGSamples() {
  console.log('🌱 Starting RAG sample seeding...\n');
  console.log('=' .repeat(50));
  
  let totalSeeded = 0;
  const samplesDir = path.join(process.cwd(), 'shared', 'lib', 'rag', 'samples');
  
  // 계층 구조 순회
  for (const [domain, config] of Object.entries(TECH_HIERARCHY)) {
    console.log(`\n📁 Processing domain: ${domain}`);
    
    // 일반 샘플
    const generalPath = path.join(samplesDir, domain, 'general.json');
    if (fs.existsSync(generalPath)) {
      try {
        const samples = JSON.parse(fs.readFileSync(generalPath, 'utf-8'));
        const results = await bulkStoreSamples(samples.map((s: any) => ({
          domain,
          problem: s,
          quality_score: s.metadata?.quality_score || 8,
        })));
        totalSeeded += results.length;
        console.log(`  ✅ General: ${results.length} samples`);
      } catch (error) {
        console.error(`  ❌ Failed to seed general samples:`, error);
      }
    } else {
      console.log(`  ⏭️  Skipped general (no file)`);
    }
    
    // 하위 카테고리
    if (config.subcategories) {
      for (const [subcat, subconfig] of Object.entries(config.subcategories)) {
        // 중분류 일반 샘플
        const subcatGeneralPath = path.join(samplesDir, domain, subcat, 'general.json');
        if (fs.existsSync(subcatGeneralPath)) {
          try {
            const samples = JSON.parse(fs.readFileSync(subcatGeneralPath, 'utf-8'));
            const results = await bulkStoreSamples(samples.map((s: any) => ({
              domain,
              subdomain: subcat,
              problem: s,
              quality_score: s.metadata?.quality_score || 8,
            })));
            totalSeeded += results.length;
            console.log(`  ✅ ${subcat}/general: ${results.length} samples`);
          } catch (error) {
            console.error(`  ❌ Failed to seed ${subcat}/general:`, error);
          }
        }
        
        // 세부 기술별 샘플
        if (typeof subconfig === 'object' && subconfig.technologies) {
          for (const tech of Object.keys(subconfig.technologies)) {
            const techPath = path.join(samplesDir, domain, subcat, `${tech}.json`);
            if (fs.existsSync(techPath)) {
              try {
                const samples = JSON.parse(fs.readFileSync(techPath, 'utf-8'));
                const results = await bulkStoreSamples(samples.map((s: any) => ({
                  domain,
                  subdomain: tech,
                  problem: s,
                  quality_score: s.metadata?.quality_score || 8,
                })));
                totalSeeded += results.length;
                console.log(`  ✅ ${subcat}/${tech}: ${results.length} samples`);
              } catch (error) {
                console.error(`  ❌ Failed to seed ${tech}:`, error);
              }
            } else {
              console.log(`  ⏭️  Skipped ${tech} (no file)`);
            }
          }
        } else {
          // 중분류 직접 샘플 (subcategories가 숫자인 경우)
          const subcatPath = path.join(samplesDir, domain, `${subcat}.json`);
          if (fs.existsSync(subcatPath)) {
            try {
              const samples = JSON.parse(fs.readFileSync(subcatPath, 'utf-8'));
              const results = await bulkStoreSamples(samples.map((s: any) => ({
                domain,
                subdomain: subcat,
                problem: s,
                quality_score: s.metadata?.quality_score || 8,
              })));
              totalSeeded += results.length;
              console.log(`  ✅ ${subcat}: ${results.length} samples`);
            } catch (error) {
              console.error(`  ❌ Failed to seed ${subcat}:`, error);
            }
          } else {
            console.log(`  ⏭️  Skipped ${subcat} (no file)`);
          }
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n🎉 Seeding complete! Total: ${totalSeeded} samples`);
  console.log(`\n💡 Tip: Missing samples will be auto-generated on first use.`);
}

// 실행
seedRAGSamples().catch((error) => {
  console.error('\n❌ Seeding failed:', error);
  process.exit(1);
});


