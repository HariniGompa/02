import { useEffect, useState } from "react"; 
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Search, Download, Mail } from "lucide-react";

const AdminDashboard = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
    fetchApplications();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/admin/login");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const fetchApplications = async () => {
    setLoading(true);

    // ⭐ Updated consistent demo data
    const demoData = [
      {
        id: "1",
        eligibility: "Eligible",
        probability: 0.91,
        created_at: "2025-12-10T09:15:00",
        profiles: { email: "aditya.rao@example.com", username: "Aditya Rao" }
      },
      {
        id: "2",
        eligibility: "Not Eligible",
        probability: 0.42,
        created_at: "2025-12-10T11:32:00",
        profiles: { email: null, username: "Megha Sharma" }
      },
      {
        id: "3",
        eligibility: "Eligible",
        probability: 0.88,
        created_at: "2025-12-10T14:55:00",
        profiles: { email: "rohan.verma@example.com", username: "Rohan Verma" }
      },
      {
        id: "4",
        eligibility: "Not Eligible",
        probability: 0.33,
        created_at: "2025-12-11T10:05:00",
        profiles: { email: null, username: "Sana Iqbal" }
      },
      {
        id: "5",
        eligibility: "Eligible",
        probability: 0.79,
        created_at: "2025-12-11T12:45:00",
        profiles: { email: "vkumar@example.com", username: "Vishal Kumar" }
      },
      {
        id: "6",
        eligibility: "Not Eligible",
        probability: 0.56,
        created_at: "2025-12-11T15:20:00",
        profiles: { email: null, username: "Harsha Patil" }
      },
      {
        id: "7",
        eligibility: "Eligible",
        probability: 0.93,
        created_at: "2025-12-10T17:40:00",
        profiles: { email: "tanya.k@example.com", username: "Tanya Kaur" }
      },
      {
        id: "8",
        eligibility: "Not Eligible",
        probability: 0.22,
        created_at: "2025-12-11T19:10:00",
        profiles: { email: null, username: "Karthik J" }
      },
      {
        id: "9",
        eligibility: "Eligible",
        probability: 0.95,
        created_at: "2025-12-10T21:55:00",
        profiles: { email: "ritus@example.com", username: "Ritu S" }
      }
    ];

    try {
      const { data, error } = await supabase
        .from("loan_applications")
        .select(`
          *,
          profiles:user_id (
            email,
            username
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        setApplications(demoData);
        setFilteredApplications(demoData);
        return;
      }

      const finalData = data && data.length > 0 ? data : demoData;
      setApplications(finalData);
      setFilteredApplications(finalData);

    } catch (error: any) {
      console.error("Unexpected fetch error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setApplications(demoData);
      setFilteredApplications(demoData);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredApplications(applications);
      return;
    }

    const filtered = applications.filter(app => 
      app.profiles?.email?.toLowerCase().includes(query.toLowerCase()) ||
      app.profiles?.username?.toLowerCase().includes(query.toLowerCase()) ||
      app.eligibility?.toLowerCase().includes(query.toLowerCase())
    );

    setFilteredApplications(filtered);
  };

  const handleExportCSV = () => {
    const csv = [
      ["Email", "Username", "Eligibility", "Probability", "Date"],
      ...filteredApplications.map(app => [
        app.profiles?.email || "N/A",
        app.profiles?.username || "N/A",
        app.eligibility || "N/A",
        app.probability ? `${(app.probability * 100).toFixed(2)}%` : "N/A",
        new Date(app.created_at).toLocaleDateString()
      ])
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loan_applications.csv";
    a.click();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const renderTable = (apps: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Eligibility</TableHead>
          <TableHead>Probability</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apps.map((app) => (
          <TableRow key={app.id}>
            <TableCell>{app.profiles?.username || "N/A"}</TableCell>
            <TableCell>{app.profiles?.email || "N/A"}</TableCell>

            <TableCell>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  app.eligibility === "Eligible"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {app.eligibility}
              </span>
            </TableCell>

            <TableCell>
              {app.probability ? `${(app.probability * 100).toFixed(2)}%` : "N/A"}
            </TableCell>

            <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>

            <TableCell>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast({
                    title: "Email Feature",
                    description: "Email integration coming soon!",
                  })
                }
              >
                <Mail className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const eligibleApps = filteredApplications.filter(app => app.eligibility === "Eligible");
  const notEligibleApps = filteredApplications.filter(app => app.eligibility === "Not Eligible");

  return (
    <div className="min-h-screen bg-gradient-accent">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 mb-6 gradient-card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by email, username, or eligibility..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6 gradient-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Applications</h3>
            <p className="text-3xl font-bold">{applications.length}</p>
          </Card>

          <Card className="p-6 gradient-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Eligible</h3>
            <p className="text-3xl font-bold text-green-600">{eligibleApps.length}</p>
          </Card>

          <Card className="p-6 gradient-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Not Eligible</h3>
            <p className="text-3xl font-bold text-red-600">{notEligibleApps.length}</p>
          </Card>
        </div>

        <Card className="gradient-card">
          <Tabs defaultValue="all" className="p-6">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Applications</TabsTrigger>
              <TabsTrigger value="eligible">Eligible</TabsTrigger>
              <TabsTrigger value="not-eligible">Not Eligible</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : filteredApplications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No applications found</p>
              ) : (
                renderTable(filteredApplications)
              )}
            </TabsContent>

            <TabsContent value="eligible">
              {eligibleApps.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No eligible applications</p>
              ) : (
                renderTable(eligibleApps)
              )}
            </TabsContent>

            <TabsContent value="not-eligible">
              {notEligibleApps.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No ineligible applications</p>
              ) : (
                renderTable(notEligibleApps)
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
