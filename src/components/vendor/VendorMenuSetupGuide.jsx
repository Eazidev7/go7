import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Lightbulb, Utensils, PlusCircle, ShoppingBag } from 'lucide-react';

/**
 * In-dashboard guide for vendors and onboarding agents — how to set up menus on GO7.
 */
export default function VendorMenuSetupGuide() {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-amber-100/50 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-5 h-5 text-amber-700 shrink-0" />
          <span className="font-semibold text-gray-900">How to set up your menu</span>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-500 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm text-gray-700">
          <p className="leading-relaxed">
            Think of your menu in three parts. This helps customers order correctly and reduces confusion at checkout.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="bg-white rounded-lg border border-amber-100 p-3">
              <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
                <Utensils className="w-4 h-4 text-amber-600" />
                Main product
              </div>
              <p>One plate, wrap, or drink on your menu. Example: <strong>Rice &amp; Beans</strong> — ₦1,200</p>
            </div>
            <div className="bg-white rounded-lg border border-amber-100 p-3">
              <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
                <PlusCircle className="w-4 h-4 text-amber-600" />
                Add-ons (extras)
              </div>
              <p>Items that go <em>with</em> that plate. Example: <strong>Fried Egg</strong> +₦200, <strong>Water</strong> +₦150</p>
            </div>
            <div className="bg-white rounded-lg border border-amber-100 p-3">
              <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                Separate products
              </div>
              <p>Items people order alone. Create each as its own product — Rice, Beans, Egg, Water — no add-ons needed.</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-amber-100 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-3">
                <p className="font-semibold text-gray-900">
                  Rice, meat &amp; egg — how to list them
                </p>
                <p className="text-gray-700">
                  <strong>One sentence:</strong> Rice is a <strong>product</strong>. Meat on top of that rice is an{' '}
                  <strong>add-on</strong>. Egg is a <strong>product</strong> if you sell it alone; it is an{' '}
                  <strong>add-on</strong> only when it always goes with one plate.
                </p>

                <div className="rounded-lg bg-amber-50/80 border border-amber-100 p-3 text-xs sm:text-sm space-y-2">
                  <p className="font-semibold text-gray-900">Typical buka / canteen setup</p>
                  <p>
                    <strong>Product:</strong> White Rice — ₦500 &nbsp;|&nbsp; Rice &amp; Stew — ₦800
                  </p>
                  <p>
                    <strong>Add-ons on Rice</strong> (scroll to &quot;Extras for this dish&quot; when editing Rice):
                    Extra meat +₦300, Extra stew +₦200, Fried plantain +₦150
                  </p>
                  <p>
                    <strong>Egg:</strong> If customers buy egg alone → create <strong>Fried Egg — ₦200</strong> as its own
                    product. If egg is only ever added to rice → add <strong>Fried Egg +₦200</strong> under Rice as an
                    extra. Do not list the same egg twice.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-xs uppercase tracking-wide text-amber-800">
                    Quick checks
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Is it the main plate they are paying for? → <strong>Product</strong></li>
                    <li>Does it go on top of that one plate? → <strong>Add-on</strong> on that product</li>
                    <li>Do people order it by itself? → <strong>Separate product</strong></li>
                  </ul>
                </div>

                <div className="border-t border-amber-100 pt-3 space-y-2">
                  <p className="font-semibold text-gray-900">Full meal examples</p>
                  <p>
                    <strong>Combo plate:</strong> Product = &quot;Rice &amp; Beans&quot;. Add-ons = Fried Egg, Bottled
                    Water. Customer taps <strong>Add extras</strong>.
                  </p>
                  <p>
                    <strong>Mix &amp; match:</strong> Separate products — Rice, Beans, Fried Egg, Water. Customer taps{' '}
                    <strong>Add to Cart</strong> on each. No add-ons needed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Full pictorial guide for onboarding agents: <code className="bg-white px-1 rounded">docs/vendor-menu-onboarding-guide.pdf</code>
          </p>
        </div>
      )}
    </div>
  );
}
