import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, TrendingUp, Users, BarChart3 } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">KI-Pricing Agent</h1>
          </div>
          <Button onClick={handleLogin} size="lg">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
            AI-Powered Hotel Pricing Intelligence
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Optimize your hotel pricing strategies with our advanced AI platform. 
            Get real-time market insights, automated calculations, and intelligent recommendations.
          </p>
          <Button onClick={handleLogin} size="lg" className="text-lg px-8 py-6">
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
          Everything You Need for Smart Pricing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Calculator className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Smart Calculator</CardTitle>
              <CardDescription>
                Excel-like interface with AI-powered pricing calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Real-time validation</li>
                <li>• Auto-scraping</li>
                <li>• VAT calculations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-accent mb-2" />
              <CardTitle>Market Intelligence</CardTitle>
              <CardDescription>
                Get competitive insights from major booking platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Price monitoring</li>
                <li>• Competitor analysis</li>
                <li>• Market trends</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle>Customer Management</CardTitle>
              <CardDescription>
                Manage your hotel clients and their pricing strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Client profiles</li>
                <li>• History tracking</li>
                <li>• Custom reports</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-purple-500 mb-2" />
              <CardTitle>Analytics & Reports</CardTitle>
              <CardDescription>
                Comprehensive reporting and export capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• PDF exports</li>
                <li>• Excel reports</li>
                <li>• Performance metrics</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to Transform Your Pricing Strategy?</CardTitle>
            <CardDescription className="text-lg">
              Join the leading hotel pricing intelligence platform trusted by professionals worldwide.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogin} size="lg" className="w-full sm:w-auto">
              Start Free Trial
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
