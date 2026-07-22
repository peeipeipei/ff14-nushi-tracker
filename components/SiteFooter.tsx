import Link from "next/link";

/** 全ページ共通のフッター (免責・クレジット・出典) */
export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-abyss-700/60 pt-5 text-center text-xs leading-relaxed text-moonlight-faint">
      <p className="text-moonlight-dim">
        本サイトはファンによる非公式サイトであり、スクウェア・エニックスとは一切関係ありません。
      </p>
      <p className="mt-1">
        FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All Rights Reserved.
      </p>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link href="/about" className="underline hover:text-moonlight">
          このサイトについて
        </Link>
        <span className="text-abyss-600">|</span>
        <a
          href="https://github.com/peeipeipei/ff14-nushi-tracker"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-moonlight"
        >
          GitHub
        </a>
        <span className="text-abyss-600">|</span>
        <span>
          データ:{" "}
          <a
            href="https://github.com/icykoneko/ff14-fish-tracker-app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-moonlight"
          >
            ff14-fish-tracker-app
          </a>{" "}
          / XIVAPI / Teamcraft
        </span>
      </p>
    </footer>
  );
}
