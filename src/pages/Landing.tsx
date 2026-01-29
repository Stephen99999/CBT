import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, BookOpen, BarChart3, Users, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { initializeSampleData } from '@/lib/storage';

const features = [
  {
    icon: BookOpen,
    title: 'Evidence-Based Courses',
    description: 'Learn CBT techniques through structured courses designed by mental health experts.',
  },
  {
    icon: Brain,
    title: 'CBT Tools',
    description: 'Practice cognitive restructuring with interactive thought records and exercises.',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    description: 'Monitor your learning journey with detailed analytics and performance insights.',
  },
  {
    icon: Users,
    title: 'Community Support',
    description: 'Connect with peers, share experiences, and learn together in our supportive forum.',
  },
];

const benefits = [
  'Reduce exam anxiety and stress',
  'Develop effective study habits',
  'Build mental resilience',
  'Track your progress over time',
  'Access expert-designed content',
  'Join a supportive community',
];

const Landing: React.FC = () => {
  useEffect(() => {
    initializeSampleData();
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container relative py-24 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>CBT-Based Learning Platform</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Master Your Mind,{' '}
              <span className="text-primary">Ace Your Exams</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Combine the power of Cognitive Behavioral Therapy with proven exam preparation 
              techniques. Build mental resilience while mastering your subject matter.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/auth?mode=register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/courses">Explore Courses</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose CBT Prep?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our unique approach combines mental wellness with academic excellence
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Transform Your Learning Experience</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our CBT-based approach doesn't just help you learn—it helps you develop 
                the mental tools you need to succeed in exams and beyond.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Brain className="h-32 w-32 text-primary/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Begin Your Journey?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of learners who have transformed their exam preparation 
            with our CBT-based approach.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth?mode=register">
              Start Learning Today
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Landing;
