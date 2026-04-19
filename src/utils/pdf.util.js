import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export function generateEventCertificate(event, requestedBy) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        const base64Str = `data:application/pdf;base64,${pdfData.toString('base64')}`;
        resolve(base64Str);
      });
      doc.on('error', reject);

      // Add logo if available
      const logoPath = path.resolve('..', 'aether-sehack-client', 'assets', 'spitLogo.jpg');
      if (fs.existsSync(logoPath)) {
        // Center the logo
        doc.image(logoPath, (doc.page.width - 80) / 2, 40, { width: 80 });
        // Move the cursor below the image so text doesn't overlap
        doc.y = 140; 
      } else {
        doc.y = 50;
      }

      // Header
      doc.fontSize(22).font('Helvetica-Bold').text('Sardar Patel Institute of Technology', { align: 'center' });
      doc.fontSize(14).font('Helvetica').text('Event Request & Approval Form', { align: 'center' });
      doc.moveDown(2);

      // Event Details
      doc.fontSize(16).font('Helvetica-Bold').text('1. Event Details', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12).font('Helvetica');
      doc.text(`Title: `, { continued: true }).font('Helvetica-Bold').text(event.title);
      doc.font('Helvetica').text(`Type: `, { continued: true }).font('Helvetica-Bold').text(event.templateType ? event.templateType.toUpperCase() : 'PLAIN');
      doc.font('Helvetica').text(`Requested By: `, { continued: true }).font('Helvetica-Bold').text(requestedBy.name || 'Student');
      doc.font('Helvetica').text(`Venue: `, { continued: true }).font('Helvetica-Bold').text(event.venue);
      doc.font('Helvetica').text(`Start Time: `, { continued: true }).font('Helvetica-Bold').text(new Date(event.startTime).toLocaleString());
      doc.font('Helvetica').text(`End Time: `, { continued: true }).font('Helvetica-Bold').text(new Date(event.endTime).toLocaleString());
      doc.font('Helvetica').text(`Expected Attendance: `, { continued: true }).font('Helvetica-Bold').text(event.expectedAttendance);
      doc.moveDown(0.5);
      
      doc.text(`Description: `).font('Helvetica-Oblique').text(event.description);
      doc.font('Helvetica');
      doc.moveDown(2);

      // Resources
      doc.fontSize(16).font('Helvetica-Bold').text('2. Requested Resources & Permissions', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      if (event.resources && event.resources.length > 0) {
        event.resources.forEach(r => doc.text(`• ${r}`));
      } else {
        doc.text('No special resources requested.');
      }

      if (event.templateType === 'hackathon') {
        doc.moveDown(0.5);
        doc.font('Helvetica-Oblique').text('CC: IT Department (it@spit.ac.in) for Lab Access');
        doc.text('CC: Security Guards for overnight campus access permissions');
      }
      doc.moveDown(2);

      // Digital Signatures
      doc.fontSize(16).font('Helvetica-Bold').text('3. Digital Signatures & Approvals', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12).font('Helvetica');
      
      // Phase 1: Student Signature
      doc.text(`Requester Signature: `, { continued: true })
         .font('Courier-Bold')
         .text(`[Digitally Signed by ${requestedBy.name}]`);
      doc.font('Helvetica').text(`Date: ${new Date(event.createdAt || Date.now()).toLocaleString()}`);
      doc.moveDown(1);

      // Phase 2+: Approval Chain
      const requiredRoles = ['council', 'hod', 'dean'];
      
      requiredRoles.forEach(role => {
        const step = event.chain ? event.chain.find(c => c.role === role) : null;
        doc.font('Helvetica-Bold').text(`${role.toUpperCase()} Approval:`);
        
        if (step && step.status === 'approved') {
          doc.font('Courier-Bold').text(`[Digitally Signed by ${role.toUpperCase()}]`);
          doc.font('Helvetica').text(`Status: APPROVED`);
          doc.text(`Timestamp: ${new Date(step.timestamp).toLocaleString()}`);
          if (step.comment) doc.text(`Comment: ${step.comment}`);
        } else if (step && step.status === 'rejected') {
          doc.font('Courier-Bold').fillColor('red').text(`[REJECTED]`);
          doc.fillColor('black').font('Helvetica').text(`Timestamp: ${new Date(step.timestamp).toLocaleString()}`);
          if (step.comment) doc.text(`Comment: ${step.comment}`);
        } else {
          doc.font('Helvetica-Oblique').text(`[Pending Signature]`);
        }
        doc.moveDown(1);
      });

      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica').text('Generated securely by Aether Extended Workflow Engine', { align: 'center', color: 'gray' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateLeaveCertificate(leave, requester, type) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        const base64Str = `data:application/pdf;base64,${pdfData.toString('base64')}`;
        resolve(base64Str);
      });
      doc.on('error', reject);

      // Add logo if available
      const logoPath = path.resolve('..', 'aether-sehack-client', 'assets', 'spitLogo.jpg');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, (doc.page.width - 80) / 2, 40, { width: 80 });
        doc.y = 140; 
      } else {
        doc.y = 50;
      }

      // Header
      doc.fontSize(22).font('Helvetica-Bold').text('Sardar Patel Institute of Technology', { align: 'center' });
      doc.fontSize(14).font('Helvetica').text('Leave Application Form', { align: 'center' });
      doc.moveDown(2);

      // Details
      doc.fontSize(16).font('Helvetica-Bold').text('1. Leave Details', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12).font('Helvetica');
      doc.text(`Requester: `, { continued: true }).font('Helvetica-Bold').text(`${requester.name} (${type.toUpperCase()})`);
      doc.font('Helvetica').text(`Leave Type: `, { continued: true }).font('Helvetica-Bold').text(leave.leaveType ? leave.leaveType.toUpperCase() : 'PERSONAL');
      doc.font('Helvetica').text(`From Date: `, { continued: true }).font('Helvetica-Bold').text(new Date(leave.fromDate).toLocaleDateString());
      doc.font('Helvetica').text(`To Date: `, { continued: true }).font('Helvetica-Bold').text(new Date(leave.toDate).toLocaleDateString());
      
      if (leave.totalDays) {
        doc.font('Helvetica').text(`Total Days: `, { continued: true }).font('Helvetica-Bold').text(`${leave.totalDays}`);
      }
      doc.moveDown(0.5);
      
      doc.text(`Reason: `).font('Helvetica-Oblique').text(leave.reason);
      doc.font('Helvetica');
      
      if (type === 'faculty' && leave.substituteNote) {
        doc.moveDown(0.5);
        doc.text(`Substitute Info: `).font('Helvetica-Oblique').text(leave.substituteNote);
        doc.font('Helvetica');
      }
      doc.moveDown(2);

      // Digital Signatures
      doc.fontSize(16).font('Helvetica-Bold').text('2. Digital Signatures & Approvals', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12).font('Helvetica');
      
      // Student/Faculty Signature
      doc.text(`Requester Signature: `, { continued: true })
         .font('Courier-Bold')
         .text(`[Digitally Signed by ${requester.name}]`);
      doc.font('Helvetica').text(`Date: ${new Date(leave.createdAt || Date.now()).toLocaleString()}`);
      doc.moveDown(1);

      // Approver Signature
      doc.font('Helvetica-Bold').text(`Authority Approval:`);
      
      if (leave.status === 'approved') {
        doc.font('Courier-Bold').text(`[Digitally Signed & APPROVED]`);
        doc.font('Helvetica').text(`Status: APPROVED`);
        // Use hodAction timestamp for faculty, or updated timestamp for student
        const tstamp = leave.hodAction?.decidedAt ? new Date(leave.hodAction.decidedAt).toLocaleString() : new Date(leave.updatedAt).toLocaleString();
        doc.text(`Timestamp: ${tstamp}`);
        const cmt = leave.hodAction?.comment || leave.remarks;
        if (cmt) doc.text(`Comment: ${cmt}`);
      } else if (leave.status === 'rejected') {
        doc.font('Courier-Bold').fillColor('red').text(`[REJECTED]`);
        doc.fillColor('black').font('Helvetica').text(`Timestamp: ${new Date(leave.updatedAt).toLocaleString()}`);
        const cmt = leave.hodAction?.comment || leave.remarks;
        if (cmt) doc.text(`Comment: ${cmt}`);
      } else {
        doc.font('Helvetica-Oblique').text(`[Pending Signature]`);
      }

      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica').text('Generated securely by Aether Extended Workflow Engine', { align: 'center', color: 'gray' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
