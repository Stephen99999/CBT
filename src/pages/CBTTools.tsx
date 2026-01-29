import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { createThoughtRecord, getUserThoughtRecords, deleteThoughtRecord } from '@/lib/storage';
import { ThoughtRecord } from '@/types';
import { Brain, PlusCircle, Trash2, Lightbulb, ArrowRight, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const cognitiveDistortions = [
  { value: 'all-or-nothing', label: 'All-or-Nothing Thinking', description: 'Seeing things in black and white categories' },
  { value: 'overgeneralization', label: 'Overgeneralization', description: 'Viewing a single negative event as a never-ending pattern' },
  { value: 'mental-filter', label: 'Mental Filter', description: 'Dwelling exclusively on negative details' },
  { value: 'disqualifying', label: 'Disqualifying the Positive', description: 'Rejecting positive experiences' },
  { value: 'jumping-conclusions', label: 'Jumping to Conclusions', description: 'Making negative interpretations without evidence' },
  { value: 'magnification', label: 'Magnification/Minimization', description: 'Exaggerating negatives or shrinking positives' },
  { value: 'emotional-reasoning', label: 'Emotional Reasoning', description: 'Assuming feelings reflect reality' },
  { value: 'should-statements', label: 'Should Statements', description: 'Criticizing yourself with "shoulds" and "musts"' },
  { value: 'labeling', label: 'Labeling', description: 'Attaching negative labels to yourself' },
  { value: 'personalization', label: 'Personalization', description: 'Blaming yourself for events outside your control' },
];

const CBTTools: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [records, setRecords] = useState<ThoughtRecord[]>([]);
  const [formData, setFormData] = useState({
    situation: '',
    automaticThought: '',
    emotion: '',
    emotionIntensity: [50],
    cognitiveDistortion: '',
    alternativeThought: '',
    newEmotionIntensity: [50],
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadRecords();
  }, [user, navigate]);

  const loadRecords = () => {
    if (user) {
      const userRecords = getUserThoughtRecords(user.id);
      setRecords(userRecords.reverse());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    createThoughtRecord({
      userId: user.id,
      situation: formData.situation,
      automaticThought: formData.automaticThought,
      emotion: formData.emotion,
      emotionIntensity: formData.emotionIntensity[0],
      cognitiveDistortion: formData.cognitiveDistortion,
      alternativeThought: formData.alternativeThought,
      newEmotionIntensity: formData.newEmotionIntensity[0],
    });

    toast({
      title: 'Thought record saved!',
      description: 'Great job practicing cognitive restructuring.',
    });

    setFormData({
      situation: '',
      automaticThought: '',
      emotion: '',
      emotionIntensity: [50],
      cognitiveDistortion: '',
      alternativeThought: '',
      newEmotionIntensity: [50],
    });

    loadRecords();
  };

  const handleDelete = (recordId: string) => {
    deleteThoughtRecord(recordId);
    loadRecords();
    toast({
      title: 'Record deleted',
      description: 'The thought record has been removed.',
    });
  };

  const getDistortionLabel = (value: string) => {
    return cognitiveDistortions.find(d => d.value === value)?.label || value;
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">CBT Tools</h1>
          <p className="text-muted-foreground">
            Practice cognitive restructuring techniques to manage exam anxiety
          </p>
        </div>

        <Tabs defaultValue="thought-record" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="thought-record" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              New Record
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="thought-record">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Thought Record
                    </CardTitle>
                    <CardDescription>
                      Document and challenge negative thoughts related to exam anxiety
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Situation */}
                      <div className="space-y-2">
                        <Label htmlFor="situation">
                          1. Situation
                          <span className="text-muted-foreground font-normal ml-2">
                            What happened? Where were you?
                          </span>
                        </Label>
                        <Textarea
                          id="situation"
                          placeholder="e.g., I was studying for my exam and couldn't understand a concept..."
                          value={formData.situation}
                          onChange={(e) => setFormData(prev => ({ ...prev, situation: e.target.value }))}
                          required
                        />
                      </div>

                      {/* Automatic Thought */}
                      <div className="space-y-2">
                        <Label htmlFor="automaticThought">
                          2. Automatic Thought
                          <span className="text-muted-foreground font-normal ml-2">
                            What went through your mind?
                          </span>
                        </Label>
                        <Textarea
                          id="automaticThought"
                          placeholder="e.g., I'm going to fail this exam. I'm not smart enough..."
                          value={formData.automaticThought}
                          onChange={(e) => setFormData(prev => ({ ...prev, automaticThought: e.target.value }))}
                          required
                        />
                      </div>

                      {/* Emotion */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emotion">
                            3. Emotion
                            <span className="text-muted-foreground font-normal ml-2">
                              What did you feel?
                            </span>
                          </Label>
                          <Input
                            id="emotion"
                            placeholder="e.g., Anxious, Frustrated, Hopeless"
                            value={formData.emotion}
                            onChange={(e) => setFormData(prev => ({ ...prev, emotion: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Intensity: {formData.emotionIntensity[0]}%
                          </Label>
                          <Slider
                            value={formData.emotionIntensity}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, emotionIntensity: value }))}
                            max={100}
                            step={5}
                            className="mt-6"
                          />
                        </div>
                      </div>

                      {/* Cognitive Distortion */}
                      <div className="space-y-2">
                        <Label htmlFor="distortion">
                          4. Cognitive Distortion
                          <span className="text-muted-foreground font-normal ml-2">
                            What thinking error might apply?
                          </span>
                        </Label>
                        <Select
                          value={formData.cognitiveDistortion}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, cognitiveDistortion: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a cognitive distortion" />
                          </SelectTrigger>
                          <SelectContent>
                            {cognitiveDistortions.map((distortion) => (
                              <SelectItem key={distortion.value} value={distortion.value}>
                                <span className="font-medium">{distortion.label}</span>
                                <span className="text-muted-foreground ml-2">- {distortion.description}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Alternative Thought */}
                      <div className="space-y-2">
                        <Label htmlFor="alternativeThought">
                          5. Alternative Thought
                          <span className="text-muted-foreground font-normal ml-2">
                            What's a more balanced way to think about this?
                          </span>
                        </Label>
                        <Textarea
                          id="alternativeThought"
                          placeholder="e.g., One difficult concept doesn't mean I'll fail. I can ask for help or try a different approach..."
                          value={formData.alternativeThought}
                          onChange={(e) => setFormData(prev => ({ ...prev, alternativeThought: e.target.value }))}
                          required
                        />
                      </div>

                      {/* New Emotion Intensity */}
                      <div className="space-y-2">
                        <Label>
                          6. New Emotion Intensity: {formData.newEmotionIntensity[0]}%
                          <span className="text-muted-foreground font-normal ml-2">
                            How do you feel now?
                          </span>
                        </Label>
                        <Slider
                          value={formData.newEmotionIntensity}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, newEmotionIntensity: value }))}
                          max={100}
                          step={5}
                        />
                      </div>

                      <Button type="submit" className="w-full">
                        Save Thought Record
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Tips Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Lightbulb className="h-5 w-5" />
                      Tips for Cognitive Restructuring
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Be specific</h4>
                      <p className="text-sm text-muted-foreground">
                        Write down the exact thought that went through your mind, not a general summary.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Question the evidence</h4>
                      <p className="text-sm text-muted-foreground">
                        Ask yourself: "What evidence supports this thought? What evidence contradicts it?"
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Be compassionate</h4>
                      <p className="text-sm text-muted-foreground">
                        What would you say to a friend having the same thought?
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Practice regularly</h4>
                      <p className="text-sm text-muted-foreground">
                        The more you practice, the easier it becomes to catch and challenge negative thoughts.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Your Thought Records</CardTitle>
                <CardDescription>
                  Review your previous cognitive restructuring exercises
                </CardDescription>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      You haven't created any thought records yet
                    </p>
                    <Button variant="outline" onClick={() => document.querySelector('[value="thought-record"]')?.dispatchEvent(new Event('click'))}>
                      Create Your First Record
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {records.map((record) => (
                      <div key={record.id} className="p-4 rounded-lg border">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(record.createdAt).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                            <p className="font-medium mt-1">{record.emotion}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="font-medium">Situation: </span>
                            <span className="text-muted-foreground">{record.situation}</span>
                          </div>
                          <div>
                            <span className="font-medium">Automatic Thought: </span>
                            <span className="text-muted-foreground">{record.automaticThought}</span>
                          </div>
                          <div>
                            <span className="font-medium">Distortion: </span>
                            <span className="text-muted-foreground">{getDistortionLabel(record.cognitiveDistortion)}</span>
                          </div>
                          <div>
                            <span className="font-medium">Alternative Thought: </span>
                            <span className="text-muted-foreground">{record.alternativeThought}</span>
                          </div>
                          <div className="flex items-center gap-4 pt-2">
                            <span className="text-muted-foreground">
                              Initial: <span className="font-medium">{record.emotionIntensity}%</span>
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-green-600 dark:text-green-400">
                              After: <span className="font-medium">{record.newEmotionIntensity}%</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CBTTools;
