// This is a test JSX file to verify MIME type handling
export default function TestComponent() {
    return {
        render: () => "<div>Test JSX component rendered</div>",
        mount: (element) => {
            if (element) {
                element.innerHTML = "<div>Test JSX component mounted</div>";
                return true;
            }
            return false;
        }
    };
}