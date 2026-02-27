// Supabase 클라이언트 초기화
// env.txt에 저장했던 값과 동일하게 사용

const SUPABASE_URL = "https://yanqidcpxqrzvbwzahzq.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_FD9el849XD8xg4eNZ0O6ow_tRuuw-Mr";

if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
  console.log("[Supabase] 클라이언트 초기화 완료");
} else {
  console.error(
    "[Supabase] supabase-js 라이브러리가 로드되지 않았습니다. CDN 스크립트를 확인하세요."
  );
}

// Supabase 클라이언트 초기화 (프론트엔드용)
// env.txt에 저장된 값을 기반으로 작성됨

const SUPABASE_URL = "https://yanqidcpxqrzvbwzahzq.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_FD9el849XD8xg4eNZ0O6ow_tRuuw-Mr";

if (!window.supabase) {
  console.error(
    "[Supabase] supabase-js 라이브러리가 로드되지 않았습니다. CDN 스크립트를 확인하세요."
  );
} else {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  // 간단한 상태 로그
  console.log("[Supabase] 클라이언트가 초기화되었습니다.", {
    url: SUPABASE_URL,
  });
}

