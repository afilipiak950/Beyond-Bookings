import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Brain, BarChart3, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-blue-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-primary dark:text-white">DocumentIQ</h1>
          </div>
          <Button onClick={handleLogin} size="lg" className="btn-primary">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-primary dark:text-white mb-6">
            AI-Powered Document <span className="text-secondary">Intelligence</span> Platform
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Transform your document processing workflow with advanced OCR and machine learning. 
            Extract insights from PDFs, Excel files, and images for optimized financial workflows.
          </p>
          <Button onClick={handleLogin} size="lg" className="btn-primary text-lg px-8 py-6">
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-primary dark:text-white mb-12">
          Everything You Need for Document Intelligence
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Document Processing</CardTitle>
              <CardDescription>
                Advanced OCR and AI-powered document analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• PDF text extraction</li>
                <li>• Excel data parsing</li>
                <li>• Image recognition</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-8 w-8 text-accent mb-2" />
              <CardTitle>AI Intelligence</CardTitle>
              <CardDescription>
                Machine learning insights from your documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Pattern recognition</li>
                <li>• Data classification</li>
                <li>• Automated insights</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle>Workflow Optimization</CardTitle>
              <CardDescription>
                Streamline your financial document workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Batch processing</li>
                <li>• Automated reports</li>
                <li>• Real-time analytics</li>
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


    </div>
  );
}
