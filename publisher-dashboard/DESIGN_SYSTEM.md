# MonetizePlus Design System

Inspired by modern enterprise UI patterns, this design system provides consistent, accessible, and professional styling for the MonetizePlus dashboard.

## 🎨 Color Palette

### Primary Colors
- **Primary Teal**: `#2abbb0` - Main brand color, use for primary actions
- **Primary Hover**: `rgba(42, 187, 176, 0.8)` - Hover states
- **Primary Dark**: `#229e94` - Active/pressed states

### Accent Colors
- **Accent Blue**: `#587eba` - Secondary actions, links
- **Accent Orange**: `#f77402` - Warnings, attention-grabbing elements

### Neutral Palette
- `#f9f8f7` - Background
- `#f4f2f2` - Hover backgrounds
- `#e9e9e9` - Borders, dividers
- `#d3d1d1` - Input borders
- `#999999` - Muted text
- `#333333` - Body text
- `#211f1f` - Headings, primary text

### Semantic Colors
- **Success**: `#49b27b` - Confirmations, success states
- **Warning**: `#e5de7d` - Warnings, cautions
- **Error**: `#ed1c24` - Errors, destructive actions

## 🔘 Buttons

### Usage Classes

```jsx
// Primary button (main actions)
<button className="btn-primary">Save Changes</button>

// Secondary button (alternative actions)
<button className="btn-secondary">Cancel</button>

// Accent button (special features)
<button className="btn-accent">Learn More</button>

// Danger button (destructive actions)
<button className="btn-danger">Delete</button>

// Success button (confirmations)
<button className="btn-success">Approve</button>

// Disabled state
<button className="btn-primary" disabled>Processing...</button>
```

### Tailwind Alternatives

```jsx
<button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded">
  Primary Action
</button>
```

## 📝 Form Inputs

### Text Inputs

```jsx
<input 
  type="text" 
  className="border border-neutral-300 focus:border-primary rounded px-3 py-2"
  placeholder="Enter text..."
/>
```

### Checkboxes (Custom Styled)

```jsx
<label className="custom-checkbox">
  <input type="checkbox" />
  <span className="checkbox-visual"></span>
  <span className="ml-2">Remember me</span>
</label>
```

### Select Dropdowns

```jsx
<select className="border border-neutral-300 focus:border-primary rounded px-3 py-2">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

## 💬 Alerts & Notifications

```jsx
// Success alert
<div className="alert alert-success">
  Operation completed successfully!
</div>

// Warning alert
<div className="alert alert-warning">
  Please review your settings
</div>

// Error alert
<div className="alert alert-error">
  An error occurred. Please try again.
</div>

// Info alert
<div className="alert alert-info">
  Here's some helpful information
</div>
```

## 🃏 Cards & Containers

### Basic Card

```jsx
<div className="card">
  <div className="card-header">
    <h3>Card Title</h3>
  </div>
  <div className="card-body">
    <p>Card content goes here...</p>
  </div>
</div>
```

### Highlight Box (Important Content)

```jsx
<div className="highlight-box">
  <h3 className="text-lg font-semibold mb-2">Important Notice</h3>
  <p>This content needs attention</p>
</div>
```

### Stat Cards (Dashboard)

```jsx
<div className="stat-card">
  <div className="stat-label">Total Users</div>
  <div className="stat-value">1,234</div>
  <div className="text-muted text-small">↑ 12% from last month</div>
</div>
```

## 📊 Tables

```jsx
<table className="table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Item 1</td>
      <td><span className="badge badge-success">Active</span></td>
      <td>
        <button className="btn-secondary">Edit</button>
      </td>
    </tr>
  </tbody>
</table>
```

## 🎯 Status Badges

```jsx
<span className="badge badge-success">Active</span>
<span className="badge badge-warning">Pending</span>
<span className="badge badge-error">Failed</span>
<span className="badge badge-info">New</span>
```

## 🪟 Modals/Dialogs

```jsx
<div className="overlay">
  <div className="dialog" style={{ width: '500px' }}>
    <div className="dialog-header">
      <h3>Dialog Title</h3>
      <button onClick={onClose}>×</button>
    </div>
    <div className="dialog-body">
      <p>Dialog content...</p>
    </div>
    <div className="dialog-footer">
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={onConfirm}>Confirm</button>
    </div>
  </div>
</div>
```

## 🎭 Navigation Tabs

```jsx
<div className="nav-tabs">
  <button className="nav-tab active">Dashboard</button>
  <button className="nav-tab">Analytics</button>
  <button className="nav-tab">Settings</button>
</div>
```

## 📱 Responsive Design

The design system includes responsive breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

All components scale appropriately for different screen sizes.

## ♿ Accessibility

- All interactive elements have proper focus states
- Color contrast ratios meet WCAG AA standards
- Keyboard navigation fully supported
- Semantic HTML structure

## 🎨 Tailwind Configuration

The design system extends Tailwind with custom colors:

```javascript
// Available in Tailwind classes
bg-primary
text-primary
border-primary
bg-neutral-50 through bg-neutral-900
bg-success
bg-error
text-accent-blue
```

## 🚀 Getting Started

1. The design system is automatically imported in `index.css`
2. Use either CSS classes or Tailwind utilities
3. Follow the examples above for consistent UI
4. Refer to `design-system.css` for detailed implementation

## 💡 Best Practices

1. **Consistency**: Use the same button style for similar actions
2. **Hierarchy**: Primary buttons for main actions, secondary for alternatives
3. **Feedback**: Always show loading, success, and error states
4. **Spacing**: Use consistent padding/margins (multiples of 4px)
5. **Color**: Limit color usage - primary for brand, semantic for states
6. **Typography**: Maintain clear hierarchy with font sizes and weights

## 🔄 Migration Guide

To update existing components:

### Old Button
```jsx
<button className="px-4 py-2 bg-blue-600 text-white rounded">
  Click me
</button>
```

### New Button
```jsx
<button className="btn-primary">
  Click me
</button>
```

### Old Input
```jsx
<input className="border p-2" />
```

### New Input
```jsx
<input type="text" className="focus:border-primary" />
```

## 📚 Examples

See the updated components in:
- `src/pages/PolicyEditorNew.jsx` - Form inputs, buttons, cards
- `src/pages/PolicyTester.jsx` - Dropdowns, buttons, results display
- `src/pages/Dashboard.jsx` - Stats, navigation, layout

---

For questions or suggestions, please refer to the design system source files or contact the development team.
