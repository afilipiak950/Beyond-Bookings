import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BarChart3, ChevronLeft, ChevronRight, Star, TrendingUp, TrendingDown, Target, Award, AlertCircle } from "lucide-react";
import type { WorkflowData } from "@/pages/workflow";

interface Props {
  data: WorkflowData;
  onUpdate: (data: Partial<WorkflowData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface CompetitorData {
  name: string;
  price: number;
  stars: number;
  rating: number;
  distance: string;
  features: string[];
}

export default function PriceComparisonStep({ data, onUpdate, onNext, onPrevious }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(Boolean(data.marketAnalysis));

  const mockCompetitors: CompetitorData[] = [
    {
      name: "Hotel Europa",
      price: 135,
      stars: 4,
      rating: 8.2,
      distance: "0.3 km",
      features: ["Free WiFi", "Breakfast", "Parking"]
    },
    {
      name: "Grand Palace Hotel",
      price: 158,
      stars: 5,
      rating: 9.1,
      distance: "0.8 km",
      features: ["Spa", "Pool", "Restaurant", "Room Service"]
    },
    {
      name: "City Center Inn",
      price: 89,
      stars: 3,
      rating: 7.5,
      distance: "1.2 km",
      features: ["Free WiFi", "24h Reception"]
    },
    {
      name: "Business Hotel Plus",
      price: 112,
      stars: 3,
      rating: 8.0,
      distance: "0.5 km",
      features: ["Business Center", "Free WiFi", "Gym"]
    },
    {
      name: "Luxury Resort & Spa",
      price: 220,
      stars: 5,
      rating: 9.3,
      distance: "2.1 km",
      features: ["Spa", "Pool", "Beach Access", "Golf Course"]
    }
  ];

  useEffect(() => {
    if (!data.competitorData) {
      performMarketAnalysis();
    }
  }, []);

  const performMarketAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const averageMarketPrice = mockCompetitors.reduce((sum, comp) => sum + comp.price, 0) / mockCompetitors.length;
      const sortedByPrice = [...mockCompetitors].sort((a, b) => a.price - b.price);
      const userPrice = data.calculationResult?.totalPrice || data.voucherPrice;
      
      // Find position in market
      let positionRanking = 1;
      for (const comp of sortedByPrice) {
        if (userPrice > comp.price) {
          positionRanking++;
        }
      }

      // Calculate recommended price based on stars and features
      const similarStarHotels = mockCompetitors.filter(comp => Math.abs(comp.stars - data.stars) <= 1);
      const recommendedPrice = similarStarHotels.length > 0 
        ? similarStarHotels.reduce((sum, comp) => sum + comp.price, 0) / similarStarHotels.length
        : averageMarketPrice;

      const marketAnalysis = {
        averageMarketPrice,
        positionRanking,
        recommendedPrice
      };

      onUpdate({
        competitorData: mockCompetitors,
        marketAnalysis
      });

      setShowAnalysis(true);
    } catch (error) {
      console.error("Market analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPositionColor = (position: number, total: number) => {
    const percentage = (position / total) * 100;
    if (percentage <= 33) return "text-green-600";
    if (percentage <= 66) return "text-yellow-600";
    return "text-red-600";
  };

  const getPositionText = (position: number, total: number) => {
    const percentage = (position / total) * 100;
    if (percentage <= 33) return "Competitive";
    if (percentage <= 66) return "Moderate";
    return "Premium";
  };

  const userPrice = data.calculationResult?.totalPrice || data.voucherPrice;
  const totalCompetitors = mockCompetitors.length + 1; // +1 for user's hotel

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <BarChart3 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Price Comparison Analysis</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Analyze your pricing against local competitors and market trends to optimize your positioning.
        </p>
      </div>

      {isAnalyzing ? (
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <h3 className="text-lg font-semibold">Analyzing Market Data</h3>
              <p className="text-gray-600">Comparing prices with local competitors...</p>
              <Progress value={75} className="w-full max-w-md mx-auto" />
            </div>
          </CardContent>
        </Card>
      ) : showAnalysis && data.marketAnalysis ? (
        <div className="space-y-6">
          {/* Market Position Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card border-blue-200/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Your Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">#{data.marketAnalysis.positionRanking}</div>
                  <div className="text-sm text-gray-600">out of {totalCompetitors} hotels</div>
                  <Badge 
                    variant="outline" 
                    className={`mt-2 ${getPositionColor(data.marketAnalysis.positionRanking, totalCompetitors)}`}
                  >
                    {getPositionText(data.marketAnalysis.positionRanking, totalCompetitors)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-green-200/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Market Average
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    €{data.marketAnalysis.averageMarketPrice.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600">average price</div>
                  <div className={`mt-2 flex items-center justify-center gap-1 text-sm ${
                    userPrice < data.marketAnalysis.averageMarketPrice 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {userPrice < data.marketAnalysis.averageMarketPrice ? (
                      <>
                        <TrendingDown className="h-4 w-4" />
                        {((data.marketAnalysis.averageMarketPrice - userPrice) / data.marketAnalysis.averageMarketPrice * 100).toFixed(1)}% below
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4" />
                        {((userPrice - data.marketAnalysis.averageMarketPrice) / data.marketAnalysis.averageMarketPrice * 100).toFixed(1)}% above
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-purple-200/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  Recommended
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    €{data.marketAnalysis.recommendedPrice.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600">optimal price</div>
                  <div className={`mt-2 flex items-center justify-center gap-1 text-sm ${
                    Math.abs(userPrice - data.marketAnalysis.recommendedPrice) <= 10 
                      ? 'text-green-600' 
                      : 'text-orange-600'
                  }`}>
                    <AlertCircle className="h-4 w-4" />
                    {Math.abs(userPrice - data.marketAnalysis.recommendedPrice) <= 10 
                      ? 'Well positioned' 
                      : 'Consider adjustment'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Competitor Comparison Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Competitor Analysis
              </CardTitle>
              <CardDescription>
                Compare your hotel with nearby competitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Hotel</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">Stars</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">Price</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">Rating</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">Distance</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Features</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* User's Hotel */}
                    <tr className="bg-blue-50/50">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                            YOUR HOTEL
                          </Badge>
                          <span className="font-semibold">{data.hotelName}</span>
                        </div>
                      </td>
                      <td className="text-center py-4 px-2">
                        <div className="flex items-center justify-center gap-1">
                          {Array.from({ length: data.stars }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </td>
                      <td className="text-center py-4 px-2">
                        <span className="font-bold text-blue-600">€{userPrice.toFixed(0)}</span>
                      </td>
                      <td className="text-center py-4 px-2">-</td>
                      <td className="text-center py-4 px-2">-</td>
                      <td className="py-4 px-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">Free WiFi</Badge>
                          <Badge variant="secondary" className="text-xs">Reception</Badge>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Competitors */}
                    {data.competitorData?.map((competitor, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-4 px-2 font-medium">{competitor.name}</td>
                        <td className="text-center py-4 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {Array.from({ length: competitor.stars }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </td>
                        <td className="text-center py-4 px-2">
                          <span className={`font-semibold ${
                            competitor.price > userPrice ? 'text-red-600' : 'text-green-600'
                          }`}>
                            €{competitor.price}
                          </span>
                        </td>
                        <td className="text-center py-4 px-2">
                          <Badge variant="outline" className={
                            competitor.rating >= 9 ? 'bg-green-50 text-green-700' :
                            competitor.rating >= 8 ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-700'
                          }>
                            {competitor.rating}
                          </Badge>
                        </td>
                        <td className="text-center py-4 px-2 text-sm text-gray-600">
                          {competitor.distance}
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex flex-wrap gap-1">
                            {competitor.features.slice(0, 3).map((feature, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                            {competitor.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{competitor.features.length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="glass-card border-orange-200/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-5 w-5" />
                Pricing Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Market Position</h4>
                  <p className="text-sm text-blue-700">
                    Your current price positions you at #{data.marketAnalysis.positionRanking} in the local market. 
                    {data.marketAnalysis.positionRanking <= 2 
                      ? " This is an excellent competitive position."
                      : data.marketAnalysis.positionRanking <= 4
                      ? " This is a good competitive position with room for optimization."
                      : " Consider adjusting your pricing strategy to improve market position."
                    }
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Profit Optimization</h4>
                  <p className="text-sm text-green-700">
                    Based on your {data.calculationResult?.marginPercentage.toFixed(1)}% profit margin, 
                    {(data.calculationResult?.marginPercentage || 0) >= 25 
                      ? " you have healthy profitability with good market positioning."
                      : " consider reviewing operational costs or adjusting pricing to improve margins."
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onPrevious}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Calculator
            </Button>
            <Button onClick={onNext} className="bg-green-600 hover:bg-green-700">
              Generate PDF Report
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <BarChart3 className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="text-lg font-semibold">Market Analysis Required</h3>
              <p className="text-gray-600">Click below to analyze your pricing against local competitors</p>
              <Button onClick={performMarketAnalysis} className="bg-green-600 hover:bg-green-700">
                Start Market Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}