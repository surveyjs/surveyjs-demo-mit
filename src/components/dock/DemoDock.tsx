"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeftRightIcon,
  ChartColumnIcon,
  ChevronDownIcon,
  CircleHelpIcon,
  Code2Icon,
  GithubIcon,
  FileDownIcon,
  MoonIcon,
  PencilRulerIcon,
  RotateCcwIcon,
  ScanLineIcon,
  SunIcon,
  UserPenIcon,
  UsersRoundIcon,
  WandSparklesIcon,
  type LucideIcon,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DockButton } from "./DockButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StorageReadOnlyBanner } from "@/components/StorageAccess";
import { useSurveyOutlineControl } from "@/components/survey-outline/SurveyOutline";
import { getNavItem, type NavId } from "@/schemas/navigation";
import { howHref, otherEditionHref, pageSourcePath, sourceHref } from "@/lib/routes";
import { DOCK_LABELS, PAGE_ACTIONS } from "@/lib/site";
import { mergeTailwindClasses } from "@/lib/utils";
import { features, type Features } from "@/features";
import { DockOverflow, SHOWN_FROM, type OverflowItem } from "./DockOverflow";
import { ExamplesMenu } from "./ExamplesMenu";
import { SeeNextCard } from "./SeeNextCard";

/** The edition config names an icon; React lives here, not in the config. */
const DESIGNER_ICONS: Record<Features["designer"]["icon"], LucideIcon> = {
  json: Code2Icon,
  designer: PencilRulerIcon,
};

/**
 * A secondary control: its icon alone until `2xl`, where the whole row fits with
 * every label, and named by `aria-label` the same at every width.
 */
const QUIET = "shrink-0 gap-1.5 rounded-full";
const LABEL = "hidden truncate 2xl:inline";

function divider(key: string, className?: string) {
  return <span key={key} className={mergeTailwindClasses("bg-border mx-0.5 h-5 w-px shrink-0", className)} aria-hidden />;
}

export interface DemoDockProps {
  /** The page's `NavId`: the current entry of the menu, and its "How this page is built". */
  exampleId: NavId;
  /** The one page this form's JSON is edited on. No link renders without it. */
  configureHref?: string;
  /** Fill every page with sample answers. */
  onPrefill?: () => void;
  prefillDisabled?: boolean;
  /** Start over: the form (an embedded demo) or this visitor's stored data (a records page). */
  onReset?: () => void;
  resetDisabled?: boolean;
  resetLabel?: string;
  resetTitle?: string;
  /** The form, or the open record, as a PDF. No button renders without it. */
  onExportPdf?: () => void;
  exportPdfDisabled?: boolean;
  /** The dashboard for this form's responses. No link renders without it. */
  analyticsHref?: string;
  /** The people the page may be rendered for. The picker renders from two of them. */
  users?: readonly { id: string; name: string; description?: string }[];
  activeUserId?: string;
  onSelectUser?: (id: string) => void;
  usersDisabled?: boolean;
  /**
   * What signing in as somebody means on this site. "Login as" is right for a
   * product; the clinician's workspace opens a patient's chart instead.
   */
  usersLabel?: string;
  usersTitle?: string;
  /** Opens the popup that edits the signed-in user. */
  onEditUser?: () => void;
  editUserDisabled?: boolean;
  editLabel?: string;
  editTitle?: string;
  /** The account has been changed in this window — worth a dot on the button. */
  edited?: boolean;
  userOpen?: boolean;
}

/**
 * The reviewer's toolbar, floating over every example page — the one dock.
 *
 * Every control exists to make a single claim checkable, and each renders only
 * when the page passes what it needs:
 *
 *  - **the current example** — opens the manifest, one line per example, and
 *    the way back to the site's use-cases page. Never collapses;
 *  - **How this page is built** and **Source** — the explainer, in this tab, and
 *    the route file on GitHub;
 *  - **the editor link** (`features.designer`) — the form is a JSON document,
 *    edited in one place that covers every form in the template. Never collapses;
 *  - **Prefill / Reset**, **PDF / Analytics** in editions that ship them;
 *  - **Login as** and **Edit the user** — the same definition, a different
 *    person, and the form changes shape. Login as never collapses;
 *  - **the edition switch** — the same pathname on the other edition's host,
 *    in this tab — and the colour scheme for every demo.
 *
 * Below `lg` the page's links and exports move into "⋯", and below `sm` the
 * form's controls follow them (`DockOverflow`); breakpoints, so the server HTML
 * is already the final layout. Pinned above the toolbar: the "See next" card,
 * once the form is finished, and the storage banner in a browser that blocks
 * the cookie.
 *
 * It is deliberately quiet — half-transparent until pointed at, for a mouse —
 * because the demo's claim is that the survey belongs to the page. It stays
 * English on a page rendered in another language, and says so to a screen
 * reader. Nothing here would ship in a host site.
 */
export function DemoDock({
  exampleId,
  configureHref,
  onPrefill,
  prefillDisabled,
  onReset,
  resetDisabled,
  resetLabel = DOCK_LABELS.reset,
  resetTitle = "Clear the answers and start the form again",
  onExportPdf,
  exportPdfDisabled,
  analyticsHref,
  users = [],
  activeUserId,
  onSelectUser,
  usersDisabled,
  usersLabel = DOCK_LABELS.loginAs,
  usersTitle = "Sign in as somebody else — the same form, a different person",
  onEditUser,
  editUserDisabled,
  editLabel = DOCK_LABELS.editUser,
  editTitle = "Change the signed-in user the form is rendered for — the editor is a SurveyJS form too",
  edited = false,
  userOpen = false,
}: DemoDockProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const outline = useSurveyOutlineControl();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const themeLabel = mounted ? `Current mode: ${isDark ? "Dark" : "Light"}` : "Colour scheme";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const how = howHref(getNavItem(exampleId).path);
  const sourcePath = pageSourcePath(pathname);
  const source = sourcePath ? sourceHref(sourcePath) : undefined;
  const { label: otherLabel, baseUrl } = features.brand.otherEdition;
  const switchLabel = `${otherLabel} →`;
  const switchHref = otherEditionHref(baseUrl, pathname);
  const activeUser = users.find((option) => option.id === activeUserId) ?? users[0];
  const DesignerIcon = DESIGNER_ICONS[features.designer.icon];

  // What "⋯" holds, in its own order: the page's links and exports below `lg`,
  // then the form's controls below `sm`. The bar shows the same items from those
  // breakpoints up, with the same guards.
  const overflow: OverflowItem[] = [
    { key: "how", label: PAGE_ACTIONS.howBuilt, icon: CircleHelpIcon, below: "lg", href: how },
    ...(source
      ? [{ key: "source", label: PAGE_ACTIONS.source, icon: GithubIcon, below: "lg", href: source, newTab: true } as const]
      : []),
    { key: "edition", label: switchLabel, icon: ArrowLeftRightIcon, below: "lg", href: switchHref, separatorBefore: true },
    ...(analyticsHref
      ? [{ key: "analytics", label: DOCK_LABELS.analytics, icon: ChartColumnIcon, below: "lg", href: analyticsHref } as const]
      : []),
    ...(onExportPdf
      ? [{ key: "pdf", label: DOCK_LABELS.savePdf, icon: FileDownIcon, below: "lg", onSelect: onExportPdf, disabled: exportPdfDisabled } as const]
      : []),
    ...(onReset
      ? [{ key: "reset", label: resetLabel, icon: RotateCcwIcon, below: "sm", onSelect: onReset, disabled: resetDisabled } as const]
      : []),
    ...(onPrefill
      ? [{ key: "prefill", label: DOCK_LABELS.prefill, icon: WandSparklesIcon, below: "sm", onSelect: onPrefill, disabled: prefillDisabled } as const]
      : []),
    ...(onEditUser
      ? [{ key: "editUser", label: editLabel, icon: UserPenIcon, below: "sm", onSelect: onEditUser, disabled: editUserDisabled } as const]
      : []),
    { key: "theme", label: themeLabel, icon: isDark ? MoonIcon : SunIcon, below: "lg", onSelect: toggleTheme, separatorBefore: true },
  ];

  const formTools = [
    onPrefill && (
      <DockButton
        key="prefill"
        variant="ghost"
        size="sm"
        className={mergeTailwindClasses(QUIET, SHOWN_FROM.sm)}
        aria-label={DOCK_LABELS.prefill}
        tooltip="Fill every page with sample answers"
        disabled={prefillDisabled}
        onClick={onPrefill}
      >
        <WandSparklesIcon />
        <span className={LABEL}>{DOCK_LABELS.prefill}</span>
      </DockButton>
    ),
    onReset && (
      <DockButton
        key="reset"
        variant="ghost"
        size="sm"
        className={mergeTailwindClasses(QUIET, SHOWN_FROM.sm)}
        aria-label={resetLabel}
        tooltip={resetTitle}
        disabled={resetDisabled}
        onClick={onReset}
      >
        <RotateCcwIcon />
        <span className={LABEL}>{resetLabel}</span>
      </DockButton>
    ),
    onExportPdf && (
      <DockButton
        key="pdf"
        variant="ghost"
        size="sm"
        className={mergeTailwindClasses(QUIET, SHOWN_FROM.lg)}
        aria-label={DOCK_LABELS.savePdf}
        tooltip="Download this form, with the answers so far, as a PDF"
        disabled={exportPdfDisabled}
        onClick={onExportPdf}
      >
        <FileDownIcon />
        <span className={LABEL}>{DOCK_LABELS.savePdf}</span>
      </DockButton>
    ),
    analyticsHref && (
      <DockButton key="analytics" tooltip="Charts built from this form's responses — SurveyJS Dashboard reads the same definition" variant="ghost" size="sm" className={mergeTailwindClasses(QUIET, SHOWN_FROM.lg)} asChild>
        <a
          href={analyticsHref}
          aria-label={DOCK_LABELS.analytics}
        >
          <ChartColumnIcon />
          <span className={LABEL}>{DOCK_LABELS.analytics}</span>
        </a>
      </DockButton>
    ),
  ].filter(Boolean);

  const userTools = [
    // The picker, once the page may be rendered for more than one person.
    // `modal={false}`: a modal dropdown locks the page scroll, and taking the
    // scrollbar away shifts this centred, fixed toolbar sideways.
    users.length > 1 && activeUser && onSelectUser && (
      <DropdownMenu key="users" modal={false}>
        <DropdownMenuTrigger asChild>
          <DockButton
            variant="ghost"
            size="sm"
            className="min-w-0 shrink gap-1.5 rounded-full"
            aria-label={`${usersLabel}: ${activeUser.name}`}
            tooltip={usersTitle}
            disabled={usersDisabled}
          >
            <UsersRoundIcon />
            <span className="hidden max-w-32 truncate sm:inline">
              {usersLabel}: {activeUser.name}
            </span>
            <ChevronDownIcon className="opacity-60" />
          </DockButton>
        </DropdownMenuTrigger>
        {/* Above the toolbar itself (z-70), which is fixed over the page. */}
        <DropdownMenuContent align="center" lang="en" className="z-[80] w-72">
          <DropdownMenuLabel>{usersLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={activeUser.id} onValueChange={onSelectUser}>
            {users.map((option) => (
              <DropdownMenuRadioItem key={option.id} value={option.id}>
                <span className="flex flex-col">
                  <span>{option.name}</span>
                  {option.description && (
                    <span className="text-muted-foreground text-xs">{option.description}</span>
                  )}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    onEditUser && (
      <DockButton
        key="editUser"
        variant={userOpen ? "secondary" : "ghost"}
        size="sm"
        className={mergeTailwindClasses("min-w-0 gap-1.5 rounded-full", SHOWN_FROM.sm, userOpen && "shadow-inner")}
        aria-pressed={userOpen}
        aria-label={editLabel}
        tooltip={editTitle}
        disabled={editUserDisabled}
        onClick={onEditUser}
      >
        <UserPenIcon />
        <span className={LABEL}>{editLabel}</span>
        {edited && <span className="bg-primary size-1.5 rounded-full opacity-70" aria-hidden />}
      </DockButton>
    ),
  ].filter(Boolean);

  return (
    // Fixed over the page, bottom centre. The column lets clicks through to the
    // page beside the card, the banner and the toolbar.
    <TooltipProvider delayDuration={150}>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4">
        <SeeNextCard currentId={exampleId} />
        <StorageReadOnlyBanner className="pointer-events-auto" />
        {/* One row, as wide as its contents and never wider than the screen: the
            longest labels truncate, and what has no room left moves into "⋯". */}
        <div
          data-demo-dock=""
          data-edition={features.edition}
          lang="en"
          role="toolbar"
          aria-label={DOCK_LABELS.toolbar}
          className="demo-dock bg-background/85 pointer-events-auto flex max-w-full flex-nowrap items-center gap-1 rounded-full border px-2 py-1.5 shadow-lg backdrop-blur"
        >
          <ExamplesMenu currentId={exampleId} />

          {/* The explainer, in this tab: everything this template says about
              the page is written there, in `how/<route>.md`. */}
          <DockButton tooltip={PAGE_ACTIONS.howBuilt} variant="ghost" size="sm" className={mergeTailwindClasses(QUIET, SHOWN_FROM.lg)} asChild>
            <a href={how} aria-label={PAGE_ACTIONS.howBuilt}>
              <CircleHelpIcon />
              <span className={LABEL}>{PAGE_ACTIONS.howBuilt}</span>
            </a>
          </DockButton>
          {source && (
            <DockButton tooltip={PAGE_ACTIONS.source} variant="ghost" size="sm" className={mergeTailwindClasses(QUIET, SHOWN_FROM.lg)} asChild>
              <a
                href={source}
                target="_blank"
                rel="noreferrer"
                aria-label={PAGE_ACTIONS.source}
              >
                <GithubIcon />
                <span className={LABEL}>{PAGE_ACTIONS.source}</span>
              </a>
            </DockButton>
          )}

          {outline.available && (
            <DockButton
              variant={outline.visible ? "secondary" : "ghost"}
              size="sm"
              className={QUIET}
              aria-label={DOCK_LABELS.highlightSurvey}
              aria-pressed={outline.visible}
              tooltip={outline.visible ? "Hide SurveyJS outlines" : "Show SurveyJS outlines"}
              onClick={outline.toggle}
            >
              <ScanLineIcon />
              <span className={LABEL}>{DOCK_LABELS.highlightSurvey}</span>
            </DockButton>
          )}

          {formTools.length > 0 && divider("form")}
          {formTools}

          {userTools.length > 0 && divider("user")}
          {userTools}

          {divider("site", "hidden lg:block")}
          {/* The same pathname on the other edition's host, in this tab: the
              routes are identical, a record's URL included. */}
          <DockButton tooltip={`This page in the ${otherLabel}`} variant="ghost" size="sm" className={mergeTailwindClasses(QUIET, SHOWN_FROM.lg)} asChild>
            <a href={switchHref} aria-label={switchLabel}>
              <ArrowLeftRightIcon />
              <span className={LABEL}>{switchLabel}</span>
            </a>
          </DockButton>
          <DockButton
            variant="ghost"
            size="icon-sm"
            className={mergeTailwindClasses("shrink-0 rounded-full", SHOWN_FROM.lg)}
            aria-label={themeLabel}
            tooltip={themeLabel}
            onClick={toggleTheme}
          >
            {isDark ? <MoonIcon /> : <SunIcon />}
          </DockButton>

          <DockOverflow items={overflow} />

          {/* The editor stays at the right edge, in the host brand. Never collapses. */}
          {configureHref && (
            <DockButton
              tooltip={features.designer.hint}
              asChild
              size="sm"
              className="demo-brand-bg text-primary-foreground min-w-0 shrink gap-1.5 rounded-full font-semibold shadow-sm hover:opacity-90"
            >
              <a href={configureHref}>
                <DesignerIcon />
                <span className="truncate">{features.designer.label}</span>
              </a>
            </DockButton>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
