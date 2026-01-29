import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">CBT Prep</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Evidence-based exam preparation using Cognitive Behavioral Therapy techniques.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Learning</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/courses" className="hover:text-primary transition-colors">All Courses</Link></li>
              <li><Link to="/cbt-tools" className="hover:text-primary transition-colors">CBT Tools</Link></li>
              <li><Link to="/forum" className="hover:text-primary transition-colors">Community</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="#" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Research</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CBT Prep. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-4 w-4 text-destructive fill-destructive" /> for mental wellness
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
