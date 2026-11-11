import fs from 'fs';

const p = 'go7 figma/components/ProfilePage.tsx';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes("import { signOut } from 'firebase/auth'")) {
  if (!s.includes("import { auth, db } from '../../src/firebase/config'")) {
    s = s.replace(
      "import { db } from '../../src/firebase/config';",
      "import { auth, db } from '../../src/firebase/config';\nimport { signOut } from 'firebase/auth';"
    );
  } else if (!s.includes("import { signOut } from 'firebase/auth'")) {
    s = s.replace(
      "import { auth, db } from '../../src/firebase/config';",
      "import { auth, db } from '../../src/firebase/config';\nimport { signOut } from 'firebase/auth';"
    );
  }
  fs.writeFileSync(p, s);
  console.log('imports added');
} else {
  console.log('imports already present');
}

console.log(
  fs
    .readFileSync(p, 'utf8')
    .split(/\n/)
    .slice(0, 8)
    .join('\n')
);
