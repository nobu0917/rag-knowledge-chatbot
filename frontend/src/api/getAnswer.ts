import type { Answer } from '../types';

/**
 * 回答取得API（現在はモック実装）。
 * 将来、本物のRAGバックエンドに差し替える際はこの関数の中身だけを
 * fetch('/api/ask', ...) 等に置き換えればよい。呼び出し側は変更不要。
 */
export async function getAnswer(question: string): Promise<Answer> {
  await delay(1000);
  return matchMockAnswer(question);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type MockEntry = {
  keywords: string[];
  answer: Answer;
};

const MOCK_ANSWERS: MockEntry[] = [
  {
    keywords: ['経費', '精算', '交通費', '領収書', '立替'],
    answer: {
      text: '経費精算は、支出日から30日以内に経費精算システムで申請してください。領収書（電子データ可）の添付が必須です。1件5万円以上の支出は、事前に所属長の承認を得る必要があります。交通費のうち通勤定期区間と重複する分は精算対象外となりますのでご注意ください。',
      sources: [
        {
          docName: '経費精算マニュアル.pdf',
          page: 4,
          excerpt: '経費の精算申請は、支出日より30日以内に経費精算システムにて行うものとする。申請には領収書（電子データを含む）の添付を必須とする。',
        },
        {
          docName: '経費精算マニュアル.pdf',
          page: 7,
          excerpt: '1件あたり5万円以上の支出については、支出前に所属長の承認を得なければならない。承認を得ずに支出した場合、精算が認められないことがある。',
        },
        {
          docName: '経費精算マニュアル.pdf',
          page: 12,
          excerpt: '出張等に伴う交通費のうち、通勤手当の支給対象区間と重複する区間の運賃は精算の対象外とする。',
        },
      ],
    },
  },
  {
    keywords: ['休暇', '有給', '有休', '残業', '勤務', '就業', '退職', 'テレワーク', '在宅'],
    answer: {
      text: '年次有給休暇は入社6か月経過後に10日付与され、以降勤続年数に応じて加算されます。取得を希望する場合は、原則として3営業日前までに所属長へ申請してください。また、時間外勤務（残業）は所属長の事前承認制であり、月45時間を超える場合は人事部への報告が必要です。',
      sources: [
        {
          docName: '就業規則.pdf',
          page: 18,
          excerpt: '年次有給休暇は、雇入れの日から起算して6か月間継続勤務し、全労働日の8割以上出勤した従業員に対し、10日を付与する。',
        },
        {
          docName: '就業規則.pdf',
          page: 19,
          excerpt: '年次有給休暇を取得しようとする者は、原則として取得日の3営業日前までに所定の様式により所属長に申請しなければならない。',
        },
        {
          docName: '就業規則.pdf',
          page: 24,
          excerpt: '時間外勤務は所属長の事前の承認を得て行うものとする。月間の時間外勤務が45時間を超えるおそれがある場合、所属長は速やかに人事部に報告しなければならない。',
        },
      ],
    },
  },
  {
    keywords: ['セキュリティ', 'パスワード', '情報', 'USB', '持ち出し', 'ウイルス', '漏洩', '漏えい'],
    answer: {
      text: '社内情報の取り扱いは情報セキュリティ規程に定められています。パスワードは12文字以上で英大文字・小文字・数字・記号を組み合わせ、90日ごとに変更してください。また、業務データの社外持ち出しには情報システム部の事前許可が必要で、私物USBメモリの業務利用は禁止されています。',
      sources: [
        {
          docName: '情報セキュリティ規程.docx',
          page: 6,
          excerpt: 'パスワードは12文字以上とし、英大文字、英小文字、数字、記号のうち3種類以上を組み合わせなければならない。パスワードは90日を超えない期間ごとに変更するものとする。',
        },
        {
          docName: '情報セキュリティ規程.docx',
          page: 9,
          excerpt: '業務上のデータを社外に持ち出す場合は、事前に情報システム部の許可を得なければならない。私物のUSBメモリその他の外部記録媒体を業務に使用することを禁止する。',
        },
      ],
    },
  },
];

const NOT_FOUND_ANSWER: Answer = {
  text: 'ご質問に関連する記載は、読み込み済みのドキュメントからは見つかりませんでした。お手数ですが、質問の表現を変えるか、担当部署へ直接お問い合わせください。',
  sources: [],
};

function matchMockAnswer(question: string): Answer {
  for (const entry of MOCK_ANSWERS) {
    if (entry.keywords.some((kw) => question.includes(kw))) {
      return entry.answer;
    }
  }
  return NOT_FOUND_ANSWER;
}
