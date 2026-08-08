export default function SetupNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-medium">Supabase가 아직 연결되지 않았습니다.</p>
      <p className="mt-1">
        프로젝트 루트에 <code>.env.local</code> 파일을 만들고{" "}
        <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
        를 설정한 뒤 서버를 재시작하세요. 자세한 방법은 README.md를 참고하세요.
      </p>
    </div>
  );
}
