import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { whatsappLink } from "./FloatingContact";

export function CartSidebar() {
  const { items, open, setOpen, setQty, remove, subtotal, clear } = useCart();

  const checkout = () => {
    if (items.length === 0) return;
    const lines = items.map((i) => `• ${i.name} × ${i.qty} — ৳${(i.price_bdt * i.qty).toLocaleString()}`).join("\n");
    const msg = `Hello! I'd like to place an order:\n\n${lines}\n\nSubtotal: ৳${subtotal.toLocaleString()}`;
    window.open(whatsappLink(msg), "_blank", "noopener,noreferrer");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Your Cart</SheetTitle>
        </SheetHeader>

        <div className="-mx-6 flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-stone-500">
              <div>
                <p className="font-medium">Your cart is empty</p>
                <p className="mt-1 text-sm">Add some tech essentials to get started.</p>
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((i) => (
                <li key={i.id} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3">
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                    {i.image_url ? (
                      <img src={i.image_url} alt={i.name} className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center text-stone-300">{i.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">{i.name}</span>
                      <button
                        onClick={() => remove(i.id)}
                        aria-label="Remove"
                        className="text-stone-400 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-brand-mango">৳{(i.price_bdt * i.qty).toLocaleString()}</span>
                    <div className="mt-auto inline-flex w-fit items-center rounded-full border border-stone-200">
                      <button
                        onClick={() => setQty(i.id, i.qty - 1)}
                        className="grid size-7 place-items-center text-stone-600 hover:text-brand-ink"
                        aria-label="Decrease"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-6 text-center text-sm">{i.qty}</span>
                      <button
                        onClick={() => setQty(i.id, i.qty + 1)}
                        className="grid size-7 place-items-center text-stone-600 hover:text-brand-ink"
                        aria-label="Increase"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="flex-col gap-2 border-t border-stone-200 pt-4 sm:flex-col sm:space-x-0">
            <div className="flex items-center justify-between text-base">
              <span className="text-stone-600">Subtotal</span>
              <span className="font-bold">৳{subtotal.toLocaleString()}</span>
            </div>
            <Button onClick={checkout} className="w-full bg-[#25D366] text-white hover:bg-[#1eb858]">
              Checkout via WhatsApp
            </Button>
            <button onClick={clear} className="text-xs text-stone-400 hover:text-stone-600">
              Clear cart
            </button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}