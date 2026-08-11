import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Compass,
  Map,
  Gauge,
  Trophy,
  Sparkles,
  BookOpen,
  GitBranch,
  Activity,
  FlaskConical,
  CalendarRange,
  LogIn,
  LogOut,
  ShieldCheck,
  Briefcase,
  Scale,
  Users,
  Rocket,
  GraduationCap,
  Building2,
  CalendarClock,
  Camera,
  User,
  Award,
  Handshake,
  CheckCircle2,
} from "lucide-react";
import { ApplyNowButton } from "./ApplyNowButton";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

// --- STUDENT NAVIGATION SECTIONS ---
const studentDashboardsSection: NavSection = {
  id: "student-dashboards",
  label: "DASHBOARDS",
  items: [
    { title: "Overview", url: "/", icon: LayoutDashboard, exact: true },
    { title: "View Results", url: "/result", icon: CheckCircle2 },
  ],
};

const studentMasterFrameworkSection: NavSection = {
  id: "student-master-framework",
  label: "MASTER FRAMEWORK",
  items: [
    { title: "Philosophy", url: "/philosophy", icon: Compass },
    { title: "4-Year Roadmap", url: "/roadmap", icon: Map },
    { title: "Evaluation Logic", url: "/evaluation", icon: Gauge },
    { title: "Track Outcomes", url: "/outcomes", icon: Trophy },
  ],
};

const studentGovernanceSection: NavSection = {
  id: "student-governance",
  label: "GOVERNANCE & OUTCOMES",
  items: [
    { title: "Career Outcomes", url: "/career-outcomes", icon: Briefcase },
    { title: "Founder Review", url: "/founder-review", icon: Award },
    { title: "Startup Residency", url: "/startup-residency", icon: Rocket },
    { title: "Industry Readiness", url: "/industry-readiness", icon: GraduationCap },
    { title: "Program Governance", url: "/program-governance", icon: Building2 },
  ],
};

const studentSections: NavSection[] = [
  studentDashboardsSection,
  studentMasterFrameworkSection,
  studentGovernanceSection,
];

// --- ADMIN NAVIGATION SECTIONS ---
const adminQuickAccessSection: NavSection = {
  id: "admin-quick-access",
  label: "ADMIN / QUICK ACCESS",
  items: [
    { title: "Manage Results", url: "/manageResult", icon: Camera },
    { title: "Command Center", url: "/command-center", icon: Activity },
    { title: "Cohort Planner", url: "/cohort-planner", icon: CalendarRange },
  ],
};

const adminDashboardsSection: NavSection = {
  id: "admin-dashboards",
  label: "DASHBOARDS",
  items: [
    { title: "Overview", url: "/", icon: LayoutDashboard, exact: true },
    { title: "View Results", url: "/result", icon: CheckCircle2 },
  ],
};

const adminMasterFrameworkSection: NavSection = {
  id: "admin-master-framework",
  label: "MASTER FRAMEWORK",
  items: [
    { title: "Philosophy", url: "/philosophy", icon: Compass },
    { title: "4-Year Roadmap", url: "/roadmap", icon: Map },
    { title: "Evaluation Logic", url: "/evaluation", icon: Gauge },
    { title: "Track Outcomes", url: "/outcomes", icon: Trophy },
    { title: "Syllabus Overview", url: "/syllabus-overview", icon: GitBranch },
    { title: "Full Syllabus", url: "/syllabus", icon: BookOpen },
    { title: "Weekly Execution Framework", url: "/weekly-framework", icon: CalendarClock },
  ],
};

const adminCoursesSection: NavSection = {
  id: "admin-courses",
  label: "COURSE DESIGNER",
  items: [
    { title: "Entrepreneurship 1", url: "/course/entrepreneurship-1", icon: FlaskConical },
  ],
};

const adminGovernanceSection: NavSection = {
  id: "admin-governance",
  label: "GOVERNANCE & OUTCOMES",
  items: [
    { title: "Career Outcomes", url: "/career-outcomes", icon: Briefcase },
    { title: "Credit Architecture", url: "/credit-mapping", icon: Scale },
    { title: "Founder Review", url: "/founder-review", icon: Award },
    { title: "Mentor Framework", url: "/mentor-framework", icon: Users },
    { title: "Startup Residency", url: "/startup-residency", icon: Rocket },
    { title: "Industry Readiness", url: "/industry-readiness", icon: GraduationCap },
    { title: "Program Governance", url: "/program-governance", icon: Building2 },
    { title: "Industry Partner (TPF)", url: "/industry-partner", icon: Handshake },
  ],
};

const adminSections: NavSection[] = [
  adminQuickAccessSection,
  adminDashboardsSection,
  adminMasterFrameworkSection,
  adminCoursesSection,
  adminGovernanceSection,
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAdmin, signOut } = useAuth();
  const isUserAdmin = isAdmin;

  // Active state checker
  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.url;
    }
    if (item.url === "/") {
      return pathname === "/";
    }
    return pathname === item.url;
  };

  const sections: NavSection[] = isUserAdmin ? adminSections : studentSections;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60 bg-sidebar/95 backdrop-blur-md">
      {/* Header Branding */}
      <SidebarHeader className="px-4 pb-3 pt-5 border-b border-sidebar-border/40">
        <Link to="/" className="flex items-center gap-3 px-1 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30 group-hover:bg-primary/25 group-hover:ring-primary/50 transition-all duration-200 shadow-sm">
            <Sparkles className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/80">
              NST · 2026
            </span>
            <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
              Entrepreneurship
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Main Navigation Content */}
      <SidebarContent className="px-2 py-3 space-y-4 overflow-y-auto">
        {sections.map((section) => (
          <SidebarGroup key={section.id} className="p-0">
            {/* Section Header */}
            <SidebarGroupLabel className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/60 px-3 py-1.5 mb-1 select-none">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isItemActive(item);
                  return (
                    <SidebarMenuItem key={item.title + item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-lg font-mono text-xs tracking-tight transition-all duration-150 ${
                          active
                            ? "bg-primary/15 text-primary font-medium border-l-2 border-primary shadow-sm"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        }`}
                      >
                        <Link to={item.url}>
                          <item.icon
                            className={`h-4 w-4 shrink-0 transition-all duration-150 ${
                              active
                                ? "text-primary scale-105"
                                : "text-muted-foreground/80 group-hover:text-foreground group-hover:scale-105"
                            }`}
                          />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer Account Section */}
      <SidebarFooter className="p-3 border-t border-sidebar-border/40 space-y-2">
        {/* Account Info Box */}
        <div className="glass-strong rounded-xl border border-border/50 bg-background/50 p-3 space-y-2.5 shadow-sm">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <User className="h-3 w-3" />
                  </div>
                  <p className="truncate font-mono text-[11px] text-foreground font-medium">
                    {user.email}
                  </p>
                </div>
                {isAdmin ? (
                  <Badge className="bg-primary/20 font-mono text-[9px] text-primary shrink-0 px-1.5 py-0.5">
                    <ShieldCheck className="mr-1 h-2.5 w-2.5" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-mono text-[9px] shrink-0 px-1.5 py-0.5">
                    Student
                  </Badge>
                )}
              </div>

              {/* Sign Out Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="h-8 w-full justify-start px-2 font-mono text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="flex items-center justify-center gap-2 h-8 w-full rounded-lg bg-primary/10 px-3 font-mono text-xs text-primary hover:bg-primary/20 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in · admin access
            </Link>
          )}
        </div>

        {/* Apply Now Button for non-admin users */}
        {!isUserAdmin && <ApplyNowButton className="w-full justify-center shadow-sm" />}

        {/* Footer Version Tag */}
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 select-none">
          v1 · master framework
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
