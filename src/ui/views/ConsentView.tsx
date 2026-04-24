import { ShieldCheck, Cookie, Trash, Eye, GitBranch } from '@phosphor-icons/react';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Separator } from '@/ui/components/ui/separator';
import { ScrollArea } from '@/ui/components/ui/scroll-area';

export function ConsentView({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-5">

          <div className="text-center">
            <img src="../assets/icons/icon-128.png" alt="ConsentTheater" className="w-16 h-16 mx-auto" />
            <h1 className="font-display text-lg font-bold mt-2">ConsentTheater</h1>
            <p className="text-xs text-muted-foreground mt-1">See what a site is really tracking — in plain language</p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Before you start</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ConsentTheater shows you what a website is really doing with your data — which cookies it drops, which trackers it loads, and whether any of that happens before you click Accept. To do that, it needs permission to peek at the website's cookies and storage in your browser.
            </p>
          </div>

          <Card>
            <CardContent className="p-3 space-y-3">
              <PermissionRow
                icon={<Eye size={16} />}
                title="Read the cookies a site sets"
                description="Cookies are tiny files websites use to remember things — or to track you. ConsentTheater reads them so it can tell you which are tracking you and which aren't."
              />
              <Separator />
              <PermissionRow
                icon={<Cookie size={16} />}
                title="Read the site's stored data"
                description="Many trackers hide in other storage spots (localStorage, sessionStorage) instead of cookies. ConsentTheater checks there too, so nothing sneaks past."
              />
              <Separator />
              <PermissionRow
                icon={<Trash size={16} />}
                title="Clear the site's cookies and stored data"
                description="To give you a clean result, ConsentTheater wipes the website's cookies and stored data before each scan. This only touches data that belongs to the website — your files, downloads, passwords, and anything else on your computer stay exactly where they are."
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck size={16} className="text-link mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">No analytics. No telemetry. No data collection.</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                    ConsentTheater doesn't collect, store, or send your browsing data anywhere. Everything runs inside your browser. No servers, no tracking pixels, no usage stats. Zero.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <GitBranch size={16} className="text-link mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Free and open source</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                    ConsentTheater is free software under the AGPL-3.0 license. Every line of code is public and anyone can read it — we have nothing to hide.
                  </p>
                  <a
                    href="https://github.com/ConsentTheater/extension"
                    target="_blank"
                    rel="noopener"
                    className="inline-block mt-1 text-[11px] text-link hover:underline"
                  >
                    View source on GitHub →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Clicking "I understand, let's go" means you've read the above and you're okay with how ConsentTheater works.
          </p>

        </div>
      </ScrollArea>

      <div className="shrink-0 border-t bg-background p-3">
        <Button size="lg" onClick={onAccept} className="w-full text-sm">
          I understand, let's go
        </Button>
      </div>
    </div>
  );
}

function PermissionRow({ icon, title, description }: { icon: preact.ComponentChildren; title: string; description: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
