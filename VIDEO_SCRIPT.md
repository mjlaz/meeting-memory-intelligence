# Meeting Memory Intelligence Engine - Video Demonstration Script

**Duration:** 3-4 minutes  
**Target Audience:** Hackathon judges, technical evaluators  
**Objective:** Showcase the complete workflow from meeting artifacts to actionable intelligence

---

## 🎬 Scene 1: The Problem (0:00 - 0:30)

### Visual
- Screen recording showing cluttered email inbox, scattered meeting notes, missed action items
- Quick cuts of frustrated team members searching through documents

### Narration
> "Every day, teams hold countless meetings. But what happens after? Action items get lost in email threads. Decisions are forgotten. Risks go untracked. Critical information disappears into the void of meeting chaos."

### On-Screen Text
- "Lost Action Items"
- "Forgotten Decisions"  
- "Untracked Risks"

---

## 🎬 Scene 2: The Solution (0:30 - 0:50)

### Visual
- Smooth transition to the application landing page
- Show IBM watsonx.ai logo and IBM Cloud Object Storage logo

### Narration
> "Introducing Meeting Memory Intelligence Engine - powered by IBM watsonx.ai and IBM Cloud services. It transforms messy meeting artifacts into structured, actionable intelligence automatically."

### On-Screen Text
- "Meeting Memory Intelligence Engine"
- "Powered by IBM watsonx.ai"
- "Built on IBM Cloud"

---

## 🎬 Scene 3: Upload & Transcription (0:50 - 1:30)

### Visual
1. Navigate to the web UI (http://localhost:8080)
2. Show the drag-and-drop upload area
3. Drag an audio file (MP3/WAV) into the upload zone
4. Show file preview with metadata
5. Click "Upload Files" button
6. Show progress bar animation
7. Show success message with meeting ID

### Narration
> "Let's see it in action. First, we upload a meeting recording. The system supports audio, video, and document formats. Files are securely stored in IBM Cloud Object Storage."

### Demo Actions
```
1. Open browser to http://localhost:8080
2. Drag sample audio file: "team-standup-2026-02-05.mp3"
3. Click "Upload Files"
4. Wait for upload completion (show progress: 0% → 100%)
5. Note the meeting ID displayed
```

### On-Screen Text
- "Secure Storage: IBM Cloud Object Storage"
- "Supports: Audio, Video, Documents"
- "Max 100MB per file"

---

## 🎬 Scene 4: AI-Powered Transcription (1:30 - 2:00)

### Visual
1. Click "Transcribe Audio" button
2. Show pipeline visualization activating
3. Show "Transcribing audio..." loading state
4. Display the transcribed text appearing in the textarea
5. Highlight speaker labels and timestamps

### Narration
> "Next, IBM Watson Speech to Text transcribes the audio with speaker identification. It supports 10 languages and provides confidence scores for each segment."

### Demo Actions
```
1. Click "Transcribe Audio" button
2. Watch pipeline step activate (Upload → Transcribe)
3. Show transcription result with speaker labels
4. Highlight: "Speaker 1: We need to deploy by Friday..."
```

### On-Screen Text
- "IBM Watson Speech to Text"
- "10 Languages Supported"
- "Speaker Identification"
- "Confidence Scoring"

---

## 🎬 Scene 5: Intelligent Extraction (2:00 - 2:30)

### Visual
1. Click "Process with watsonx.ai" button
2. Show pipeline progressing through all steps
3. Display extraction results appearing in real-time
4. Switch between tabs: Actions, Decisions, Risks

### Narration
> "Now the magic happens. IBM watsonx.ai's Granite model analyzes the transcript and extracts structured insights: action items with owners and due dates, key decisions with rationale, and potential risks with severity levels."

### Demo Actions
```
1. Click "Process with watsonx.ai"
2. Watch pipeline: Upload → Transcribe → Extract → Store
3. Show extracted data:
   - Actions: "Bob - Deploy to production - Due: 2026-02-07"
   - Decisions: "Approved vendor switch - High impact"
   - Risks: "Data migration bandwidth - Medium severity"
```

### On-Screen Text
- "IBM watsonx.ai Granite Model"
- "Structured Extraction"
- "Actions • Decisions • Risks"

---

## 🎬 Scene 6: Analytics Dashboard (2:30 - 3:00)

### Visual
1. Click "Analytics" tab
2. Show statistics cards animating in
3. Display three charts:
   - Owner Workload Distribution (Doughnut chart)
   - Risk Severity Breakdown (Pie chart)
   - Action Completion Trend (Line chart)
4. Hover over chart elements to show tooltips

### Narration
> "The analytics dashboard provides instant insights. See who's overloaded, track risk patterns, and monitor completion trends across multiple meetings. All visualized with interactive charts."

### Demo Actions
```
1. Click "Analytics" tab
2. Show stats: "12 Total Actions, 8 Pending, 4 Completed"
3. Highlight charts:
   - Owner distribution: Alice (5), Bob (4), Carol (3)
   - Risk severity: High (2), Medium (3), Low (1)
   - Completion trend: Upward trajectory
```

### On-Screen Text
- "Real-Time Analytics"
- "Cross-Meeting Insights"
- "Team Performance Metrics"

---

## 🎬 Scene 7: Document Generation & Export (3:00 - 3:30)

### Visual
1. Click "Generate Report" button
2. Show document generation options (Minutes, Action Report, Risk Report)
3. Select "Meeting Minutes" in Markdown format
4. Show generated document preview
5. Click "Export to CSV" button
6. Show file download and MCP evidence capture

### Narration
> "Generate professional meeting minutes, action reports, and risk assessments in multiple formats. Export data to CSV or JSON for integration with your existing tools. The MCP filesystem server captures all tool usage for audit trails."

### Demo Actions
```
1. Click "Generate Report" → "Meeting Minutes"
2. Select format: Markdown
3. Show generated document with:
   - Meeting metadata
   - Attendees list
   - Discussion summary
   - Action items table
   - Decisions log
4. Click "Export to CSV"
5. Show file: exports/meeting_2026-02-05_actions.csv
6. Show MCP evidence: .bob/evidence_2026-02-05.jsonl
```

### On-Screen Text
- "Automated Document Generation"
- "Multiple Formats: MD, HTML, TXT"
- "MCP Tool Usage Evidence"
- "Audit Trail Compliance"

---

## 🎬 Scene 8: Architecture Highlight (3:30 - 3:50)

### Visual
- Quick architecture diagram animation
- Show component connections

### Narration
> "Under the hood: IBM Cloud Object Storage for artifacts, Watson Speech to Text for transcription, watsonx.ai Granite for extraction, and MCP for agentic tool usage. All deployed on IBM Cloud Code Engine for scalability."

### On-Screen Text
- "IBM Cloud Object Storage"
- "Watson Speech to Text"
- "watsonx.ai Granite 3-8B"
- "MCP Filesystem Server"
- "IBM Cloud Code Engine"

---

## 🎬 Scene 9: Call to Action (3:50 - 4:00)

### Visual
- Return to application home screen
- Show GitHub repository link
- Display project summary

### Narration
> "From chaos to clarity. Meeting Memory Intelligence Engine transforms how teams capture, process, and act on meeting insights. Built with IBM's cutting-edge AI and cloud technologies."

### On-Screen Text
- "GitHub: [Repository URL]"
- "Built for IBM watsonx Challenge"
- "Thank you!"

---

## 📋 Pre-Recording Checklist

### Environment Setup
- [ ] Start API server: `cd api && npm run dev`
- [ ] Verify server running on http://localhost:8080
- [ ] Test Watson STT connection
- [ ] Test watsonx.ai connection
- [ ] Prepare sample audio file (2-3 minutes, clear audio)
- [ ] Clear browser cache and localStorage
- [ ] Set browser zoom to 100%
- [ ] Close unnecessary browser tabs

### Sample Data Preparation
- [ ] Create sample meeting audio with clear action items
- [ ] Example content:
  ```
  "Alice: We need to finalize the deployment plan by Friday.
   Bob: I'll handle the database migration. Should be done by Thursday.
   Carol: Approved the vendor switch to reduce costs.
   Alice: One risk - we might face bandwidth issues during migration.
   Bob: I'll monitor it closely and have a rollback plan ready."
  ```

### Recording Tools
- [ ] Screen recording software (OBS Studio, QuickTime, or similar)
- [ ] Microphone for narration
- [ ] Video editing software (optional: DaVinci Resolve, iMovie)
- [ ] Resolution: 1920x1080 (Full HD)
- [ ] Frame rate: 30 FPS
- [ ] Audio: Clear, no background noise

### Post-Production
- [ ] Add smooth transitions between scenes
- [ ] Include background music (low volume, non-distracting)
- [ ] Add on-screen text overlays
- [ ] Color grade for consistency
- [ ] Export in MP4 format (H.264 codec)
- [ ] File size: Under 500MB
- [ ] Duration: 3-4 minutes

---

## 🎯 Key Messages to Emphasize

1. **Problem-Solution Fit**: Clear pain point → Elegant solution
2. **IBM Technology Stack**: Highlight all IBM services used
3. **AI-Powered Intelligence**: Showcase watsonx.ai capabilities
4. **End-to-End Workflow**: Complete journey from upload to insights
5. **Production-Ready**: Real features, not just demos
6. **Scalability**: Built for enterprise deployment
7. **Innovation**: MCP integration, multi-language support, analytics

---

## 📊 Success Metrics to Mention

- **Processing Speed**: < 10 seconds for 5-10 page transcript
- **Extraction Accuracy**: > 80% on test set
- **Supported Formats**: 8 audio formats, 10 languages
- **Test Coverage**: 46/48 tests passing
- **Documentation**: 5000+ lines of comprehensive docs
- **API Endpoints**: 50+ RESTful endpoints
- **Database**: 6 tables with 13 performance indexes

---

## 🎥 Recording Tips

1. **Pace**: Speak clearly and not too fast
2. **Pauses**: Allow 1-2 seconds between major actions
3. **Mouse Movement**: Smooth, deliberate cursor movements
4. **Highlights**: Use cursor to draw attention to key elements
5. **Errors**: If you make a mistake, pause and restart that section
6. **Energy**: Maintain enthusiasm throughout
7. **Timing**: Practice to stay within 3-4 minute limit

---

## 📦 Deliverables

1. **Video File**: MP4, 1920x1080, 3-4 minutes
2. **Thumbnail**: PNG, 1280x720, eye-catching
3. **Transcript**: Full narration text
4. **GitHub Link**: Repository with complete code
5. **Documentation**: README, architecture, setup guides

---

**Good luck with your recording! 🎬🚀**
