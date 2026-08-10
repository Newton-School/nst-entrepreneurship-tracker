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
  Handshake,
  Building2,
  CalendarClock,
  Camera,
} from "lucide-react";
import { ApplyNowButton } from "./ApplyNowButton";
import { useAuth, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  academic_board: "Board",
  mentor: "Mentor",
  student: "Student",
};

const dashboard = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Command Center", url: "/command-center", icon: Activity },
  { title: "Cohort Planner", url: "/cohort-planner", icon: CalendarRange },
];

const masterFramework = [
  { title: "Philosophy", url: "/philosophy", icon: Compass },
  { title: "4-Year Roadmap", url: "/roadmap", icon: Map },
  { title: "Evaluation Logic", url: "/evaluation", icon: Gauge },
  { title: "Track Outcomes", url: "/outcomes", icon: Trophy },
  { title: "Syllabus Overview", url: "/syllabus-overview", icon: GitBranch },
  { title: "Full Syllabus", url: "/syllabus", icon: BookOpen },
  { title: "Weekly Execution Framework", url: "/weekly-framework", icon: CalendarClock },
];

const courses = [
  { title: "Entrepreneurship 1", url: "/course/entrepreneurship-1", icon: FlaskConical },
];

const governance = [
  { title: "Career Outcomes", url: "/career-outcomes", icon: Briefcase },
  { title: "Credit Architecture", url: "/credit-mapping", icon: Scale },
  { title: "Founder Review", url: "/founder-review", icon: Trophy },
  { title: "Mentor Framework", url: "/mentor-framework", icon: Users },
  { title: "Startup Residency", url: "/startup-residency", icon: Rocket },
  { title: "Industry Readiness", url: "/industry-readiness", icon: GraduationCap },
  { title: "Program Governance", url: "/program-governance", icon: Building2 },
  { title: "Industry Partner (TPF)", url: "/industry-partner", icon: Handshake },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (p: string) => pathname === p;
  const { user, role, isStaff, isStudent, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 pb-2 pt-4">
        <Link to="/" className="flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              NST · 2026
            </span>
            <span className="font-mono text-sm tracking-tight text-foreground">
              Entrepreneurship
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboard.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="font-mono text-sm">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Master Framework
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {masterFramework.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="font-mono text-sm">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Course Designer
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {courses.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <Link to={item.url} className="font-mono text-sm">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Governance & Outcomes
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {governance.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="font-mono text-sm">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        <div className="rounded-lg border border-border/50 bg-background/40 p-2.5">
          {user ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-mono text-[11px] text-foreground">{user.email}</p>
                {role === "admin" || role === "academic_board" ? (
                  <Badge className="bg-primary/30 font-mono text-[9px] text-primary">
                    <ShieldCheck className="mr-1 h-2.5 w-2.5" />
                    {ROLE_LABEL[role]}
                  </Badge>
                ) : role === "mentor" ? (
                  <Badge className="bg-primary/20 font-mono text-[9px] text-primary">
                    {ROLE_LABEL.mentor}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-mono text-[9px]">
                    {role ? ROLE_LABEL[role] : "No role"}
                  </Badge>
                )}
              </div>

              {isStaff ? (
                <Link
                  to="/manageResult"
                  className="flex items-center gap-2 h-7 w-full justify-start px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  <Camera className="mr-2 h-3 w-3 text-primary" />
                  Manage Result
                </Link>
              ) : (
                <Link
                  to="/result"
                  className="flex items-center gap-2 h-7 w-full justify-start px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  <Camera className="mr-2 h-3 w-3 text-primary" />
                  View Result
                </Link>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="h-7 w-full justify-start px-2 font-mono text-[10px] uppercase tracking-widest"
              >
                <LogOut className="mr-2 h-3 w-3" />
                Sign out
              </Button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in · admin access
            </Link>
          )}
        </div>

        {isStudent && <ApplyNowButton className="w-full justify-center" />}
        <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
          v1 · master framework
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
