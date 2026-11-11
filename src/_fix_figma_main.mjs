import fs from 'fs';
import path from 'path';

const file = path.join('go7 figma', 'FigmaApp.tsx');
let s = fs.readFileSync(file, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
s = s.replace(/\r\n/g, '\n');

const start = s.indexOf('{/* Main Content */}');
const floatStart = s.indexOf('{/* Floating Cart Button');
if (start === -1 || floatStart === -1 || floatStart <= start) {
  console.error('Could not locate Main Content block');
  process.exit(1);
}

const before = s.slice(0, start);
const after = s.slice(floatStart);
const fixedMain = `{/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Suspense fallback={<ScreenLoader />}>
          <ScreenErrorBoundary>
            {renderCurrentScreen()}
          </ScreenErrorBoundary>
        </Suspense>
      </div>

      `;

s = before + fixedMain + after;
fs.writeFileSync(file, eol === '\r\n' ? s.replace(/\n/g, '\r\n') : s);
console.log('Normalized FigmaApp main content Suspense');
