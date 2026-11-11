// This is a test module to verify ES module loading
export default function testModule() {
    return "Module loaded successfully! ES modules are working.";
}

export function getVersion() {
    return "1.0.0";
}

export const config = {
    enabled: true,
    features: ["modules", "testing", "diagnostics"]
};