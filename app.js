// Fix for standalone Lucide
const { useState, useEffect } = React;
// lucide's UMD icons are objects and can cause React "element type is invalid" errors
// when used directly as component types in JSX. Use simple inline icons (emoji/spans)
// in this standalone setup to avoid those issues.

// ============================================================================
// CONFIGURATION - Edit these to customize your workout options
// ============================================================================

const DEFAULT_REPS = 8;
const DEFAULT_SETS = 1;
const MAX_REPS = 15;

// Define all exercise categories and their types
const CATEGORIES = {
  'Upper Push': ['Push-ups', 'Overhead press (dumbbells)', 'Overhead press (barbell)'],
  'Upper Pull': ['Bent-over rows', 'Overhead hang', 'Standing rows'],
  'Lower Push': ['Split squat', 'Goblet squat', 'Step-ups'],
  'Lower Pull': ['Deadlifts', 'Single-leg deadlift', 'Kettlebell swings'],
  'Core': ['Plank', 'Side plank', 'Plank cycle']
};

// Some exercises use time instead of reps
const TIME_EXERCISES = ['Plank', 'Side plank', 'Plank cycle', 'Overhead hang'];

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function WorkoutTracker() {
  // State: stores all workouts as an array
  const [workouts, setWorkouts] = useState([]);
  
  // State: tracks which workout is currently being edited (null = none)
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);

  // State for import/export modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedData, setImportedData] = useState(null);
  const fileInputRef = React.useRef(null);


  // Load workouts from browser storage when app first loads
  useEffect(() => {
    const stored = localStorage.getItem('workouts');
    if (stored) {
      setWorkouts(JSON.parse(stored));
    }
  }, []); // Empty array = only run once on mount

  // Save workouts to browser storage whenever they change
  useEffect(() => {
    localStorage.setItem('workouts', JSON.stringify(workouts));
  }, [workouts]); // Run whenever workouts array changes

  // --------------------------------------------------------------------------
  // IMPORT / EXPORT FUNCTIONS
  // --------------------------------------------------------------------------

  const handleExport = () => {
    if (workouts.length === 0) {
      alert("No workout data to export.");
      return;
    }

    const dataStr = JSON.stringify(workouts, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    link.download = `workout_data_${date}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          throw new Error("Data is not a valid workout array.");
        }
        setImportedData(data);
        setIsImportModalOpen(true);
      } catch (error) {
        alert("Invalid file format. Please select a valid JSON file exported from this app.");
      } finally {
        // Reset file input to allow selecting the same file again
        event.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  const handleOverwrite = () => {
    setWorkouts(importedData);
    setIsImportModalOpen(false);
    setImportedData(null);
  };

  const handleAdd = () => {
    setWorkouts(prevWorkouts => [...prevWorkouts, ...importedData]);
    setIsImportModalOpen(false);
    setImportedData(null);
  };


  // --------------------------------------------------------------------------
  // ROUND FUNCTIONS
  // --------------------------------------------------------------------------

  // Add a round break after the last exercise in a workout
  const addRound = (workoutId) => {
    setWorkouts(workouts.map(w => {
      if (w.id !== workoutId || w.exercises.length === 0) return w;
      
      const lastExerciseId = w.exercises[w.exercises.length - 1].id;
      // Avoid adding duplicate round breaks
      if (w.roundBreaks && w.roundBreaks.includes(lastExerciseId)) return w;

      return {
        ...w,
        roundBreaks: [...(w.roundBreaks || []), lastExerciseId]
      };
    }));
  };

  // Delete a round break
  const deleteRound = (workoutId, exerciseId) => {
    setWorkouts(workouts.map(w => 
      w.id === workoutId
        ? { ...w, roundBreaks: w.roundBreaks.filter(id => id !== exerciseId) }
        : w
    ));
  };

  // --------------------------------------------------------------------------
  // WORKOUT FUNCTIONS
  // --------------------------------------------------------------------------

  // Create a new workout and put it in edit mode
  const addWorkout = () => {
    const newWorkout = {
      id: Date.now().toString(), // Use timestamp as unique ID
      date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      notes: '',
      exercises: [],
      roundBreaks: [] // Add round breaks array
    };
    // Add to beginning of array (most recent first)
    setWorkouts([newWorkout, ...workouts]);
    setEditingWorkoutId(newWorkout.id);
  };

  // Update a workout's date or notes
  const updateWorkout = (id, field, value) => {
    setWorkouts(workouts.map(w => 
      w.id === id ? { ...w, [field]: value } : w
    ));
  };

  // Delete a workout (only works if it has no exercises)
  const deleteWorkout = (id) => {
    setWorkouts(workouts.filter(w => w.id !== id));
    if (editingWorkoutId === id) {
      setEditingWorkoutId(null);
    }
  };

  // --------------------------------------------------------------------------
  // EXERCISE FUNCTIONS
  // --------------------------------------------------------------------------

  // Add a new exercise to a workout
  const addExercise = (workoutId) => {
    const newExercise = {
      id: Date.now().toString(),
      category: 'Upper Push', // Default category
      type: 'Push-ups',       // Default type
      sets: DEFAULT_SETS,                // Default sets
      reps: DEFAULT_REPS,                // Default reps
      weight: '',             // Empty weight
      notes: ''               // Empty notes
    };
    
    setWorkouts(workouts.map(w =>
      w.id === workoutId 
        ? { ...w, exercises: [...w.exercises, newExercise] }
        : w
    ));
  };

  // Update an exercise field (category, type, reps, weight, time, notes)
  const updateExercise = (workoutId, exerciseId, field, value) => {
    setWorkouts(workouts.map(w => {
      if (w.id !== workoutId) return w;
      
      return {
        ...w,
        exercises: w.exercises.map(e => {
          if (e.id !== exerciseId) return e;
          
          // Special handling when changing category
          if (field === 'category') {
            const newType = CATEGORIES[value][0]; // Get first type in new category
            const updates = { category: value, type: newType };
            
            // Convert between reps and time when needed
            if (TIME_EXERCISES.includes(newType) && e.reps !== undefined) {
              updates.time = '';
              delete updates.reps;
            } else if (!TIME_EXERCISES.includes(newType) && e.time !== undefined) {
              updates.reps = DEFAULT_REPS;
              delete updates.time;
            }
            return { ...e, ...updates };
          }
          
          // Special handling when changing type
          if (field === 'type') {
            const updates = { type: value };
            
            // Convert between reps and time when needed
            if (TIME_EXERCISES.includes(value) && e.reps !== undefined) {
              updates.time = '';
              delete updates.reps;
            } else if (!TIME_EXERCISES.includes(value) && e.time !== undefined) {
              updates.reps = DEFAULT_REPS;
              delete updates.time;
            }
            return { ...e, ...updates };
          }
          
          // Regular field update
          return { ...e, [field]: value };
        })
      };
    }));
  };

  // Copy an exercise (adds duplicate to end of workout)
  const copyExercise = (workoutId, exercise) => {
    const copiedExercise = {
      ...exercise,
      id: Date.now().toString() // New unique ID
    };
    
    setWorkouts(workouts.map(w =>
      w.id === workoutId
        ? { ...w, exercises: [...w.exercises, copiedExercise] }
        : w
    ));
  };

  // Delete an exercise from a workout
  const deleteExercise = (workoutId, exerciseId) => {
    setWorkouts(workouts.map(w => {
      if (w.id !== workoutId) return w;

      // Also remove any round break associated with the deleted exercise
      const newRoundBreaks = w.roundBreaks ? w.roundBreaks.filter(id => id !== exerciseId) : [];
      const newExercises = w.exercises.filter(e => e.id !== exerciseId);

      return { ...w, exercises: newExercises, roundBreaks: newRoundBreaks };
    }));
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="container mx-auto p-4 max-w-2xl">
        
        <header className="mb-4">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Workout Tracker</h1>
          <div className="flex justify-between items-center">
            <p className="text-slate-600">Track your progress and reach your goals.</p>
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".json"
                style={{ display: 'none' }} 
              />
              <button 
                onClick={handleImportClick}
                className="text-sm bg-white border border-slate-300 text-slate-700 py-1 px-3 rounded-md font-medium hover:bg-slate-50 transition"
              >
                Import
              </button>
              <button 
                onClick={handleExport}
                className="text-sm bg-white border border-slate-300 text-slate-700 py-1 px-3 rounded-md font-medium hover:bg-slate-50 transition"
              >
                Export
              </button>
            </div>
          </div>
        </header>

        <button
          onClick={addWorkout}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 mb-6 hover:bg-blue-700 transition"
        >
          <span aria-hidden style={{fontSize: 18}}>➕</span>
          Add Workout
        </button>

        {/* List of Workouts */}
        <div className="space-y-4">
          {workouts.map(workout => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              isEditing={editingWorkoutId === workout.id}
              onEdit={() => setEditingWorkoutId(workout.id)}
              onUpdate={updateWorkout}
              onDelete={deleteWorkout}
              onAddExercise={addExercise}
              onUpdateExercise={updateExercise}
              onCopyExercise={copyExercise}
              onDeleteExercise={deleteExercise}
              onAddRound={addRound}
              onDeleteRound={deleteRound}
            />
          ))}
        </div>

      </div>
      
      {/* Import Confirmation Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Import Data</h2>
            <p className="text-slate-600 mb-6">
              A valid workout file was selected. Do you want to overwrite existing data or add the new data to it?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="bg-slate-100 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition"
              >
                Add
              </button>
              <button
                onClick={handleOverwrite}
                className="bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mount the app when running in a browser without a bundler
// (This avoids needing `export`/module support and fixes the "exports is not defined" error.)
if (typeof document !== 'undefined') {
  const rootEl = document.getElementById('root');
  if (rootEl && ReactDOM && ReactDOM.createRoot) {
    // Use JSX here so Babel transforms it consistently with the rest of the file
    ReactDOM.createRoot(rootEl).render(<WorkoutTracker />);
  }
}

// ============================================================================
// WORKOUT CARD COMPONENT
// Displays a single workout with its exercises
// ============================================================================

function WorkoutCard({ 
  workout, 
  isEditing, 
  onEdit, 
  onUpdate, 
  onDelete,
  onAddExercise,
  onUpdateExercise,
  onCopyExercise,
  onDeleteExercise,
  onAddRound,
  onDeleteRound
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      
      {/* Workout Header: Date, Notes, and Action Buttons */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          
          {/* Date Field */}
          {isEditing ? (
            <input
              type="date"
              value={workout.date}
              onChange={(e) => onUpdate(workout.id, 'date', e.target.value)}
              className="text-lg font-semibold text-slate-800 border border-slate-300 rounded px-2 py-1 mb-2"
            />
          ) : (
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              {new Date(workout.date + 'T00:00:00').toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
          )}
          
          {/* Notes Field */}
          {isEditing ? (
            <textarea
              value={workout.notes}
              onChange={(e) => onUpdate(workout.id, 'notes', e.target.value)}
              placeholder="Workout notes..."
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-600 resize-none"
              rows="2"
            />
          ) : (
            workout.notes && (
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{workout.notes}</p>
            )
          )}
        </div>
        
        {/* Action Buttons: Edit and Delete */}
        <div className="flex gap-2 ml-4">
          {!isEditing && (
            <button
              onClick={onEdit}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded transition"
            >
              <span aria-hidden style={{fontSize: 14}}>✏️</span>
            </button>
          )}
          <button
            onClick={() => onDelete(workout.id)}
            disabled={workout.exercises.length > 0}
            className={`p-2 rounded transition ${
              workout.exercises.length > 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <span aria-hidden style={{fontSize: 14}}>🗑️</span>
          </button>
        </div>
      </div>

      {/* List of Exercises */}
      <div className="space-y-3">
        {(() => {
          const exerciseElements = [];
          let roundCounter = 1;

          (workout.exercises || []).forEach((exercise, index) => {
            exerciseElements.push(
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                workoutId={workout.id}
                isEditing={isEditing}
                onUpdate={onUpdateExercise}
                onCopy={onCopyExercise}
                onDelete={onDeleteExercise}
              />
            );

            // Check if a round break should be rendered after this exercise
            if (workout.roundBreaks && workout.roundBreaks.includes(exercise.id)) {
              roundCounter++;
              exerciseElements.push(
                <div key={`round-${exercise.id}`} className="flex items-center gap-3 py-2">
                  <hr className="flex-grow border-t border-slate-200" />
                  <div className="text-sm font-medium text-slate-500">
                    Round {roundCounter}
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => onDeleteRound(workout.id, exercise.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <span aria-hidden style={{fontSize: 14}}>🗑️</span>
                    </button>
                  )}
                  <hr className="flex-grow border-t border-slate-200" />
                </div>
              );
            }
          });
          return exerciseElements;
        })()}
      </div>

      {/* Add Exercise and Add Round Buttons (only shown in edit mode) */}
      {isEditing && (
        <div className="mt-4 space-y-2">
          <button
            onClick={() => onAddExercise(workout.id)}
            className="w-full bg-slate-100 text-slate-700 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition"
          >
            <span aria-hidden style={{fontSize: 14}}>➕</span>
            Add Exercise
          </button>
          <button
            onClick={() => onAddRound(workout.id)}
            disabled={workout.exercises.length === 0 || (workout.roundBreaks && workout.roundBreaks.includes(workout.exercises[workout.exercises.length - 1].id))}
            className="w-full bg-slate-100 text-slate-700 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span aria-hidden style={{fontSize: 14}}>📑</span>
            Add Round
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXERCISE CARD COMPONENT
// Displays a single exercise (read-only or editable)
// ============================================================================

function ExerciseCard({ exercise, workoutId, isEditing, onUpdate, onCopy, onDelete }) {
  // Check if this is a core exercise or a time-based exercise
  const isCore = exercise.category === 'Core';
  const isTime = TIME_EXERCISES.includes(exercise.type);
  
  // Backwards compatibility for exercises created before sets were added
  const safeExercise = { sets: 1, ...exercise };

  // --------------------------------------------------------------------------
  // READ-ONLY VIEW
  // --------------------------------------------------------------------------
  
  if (!isEditing) {
    return (
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Exercise Type */}
            <div className="font-medium text-slate-800">{safeExercise.type}</div>
            
            {/* Exercise Details */}
            <div className="text-sm text-slate-600 mt-1">
              {safeExercise.category}
              {isTime ? (
                // Show time for relevant exercises instead of sets/reps
                safeExercise.time && ` • ${safeExercise.time} sec`
              ) : (
                // Show sets and reps for other exercises
                ` • ${safeExercise.sets} × ${safeExercise.reps} reps`
              )}
              {/* Show weight for non-core exercises */}
              {!isCore && safeExercise.weight && ` • ${safeExercise.weight} lbs`}
            </div>
            
            {/* Exercise Notes */}
            {safeExercise.notes && (
              <div className="text-sm text-slate-500 mt-1 italic">{safeExercise.notes}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // EDIT VIEW
  // --------------------------------------------------------------------------
  
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
      <div className="space-y-3">
        
        {/* Category and Type Dropdowns */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
            <select
              value={safeExercise.category}
              onChange={(e) => onUpdate(workoutId, safeExercise.id, 'category', e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
              {Object.keys(CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
            <select
              value={safeExercise.type}
              onChange={(e) => onUpdate(workoutId, safeExercise.id, 'type', e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
              {CATEGORIES[safeExercise.category].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sets, Reps/Time and Weight Fields */}
        <div className="grid grid-cols-3 gap-3">
          
          {/* Sets (dropdown) */}
          {!isTime && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sets</label>
              <select
                value={safeExercise.sets}
                onChange={(e) => onUpdate(workoutId, safeExercise.id, 'sets', parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              >
                {[1, 2, 3].map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          )}

          {/* Reps (dropdown) or Time (text input) */}
          <div className={isTime ? "col-span-3" : ""}>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isTime ? 'Time (sec)' : 'Reps'}
            </label>
            {isTime ? (
              <input
                type="number"
                value={safeExercise.time || ''}
                onChange={(e) => onUpdate(workoutId, safeExercise.id, 'time', e.target.value)}
                placeholder="0"
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              />
            ) : (
              // Reps dropdown for other exercises
              <select
                value={safeExercise.reps}
                onChange={(e) => onUpdate(workoutId, safeExercise.id, 'reps', parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              >
                {[...Array(MAX_REPS)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            )}
          </div>
          
          {/* Weight Field (hidden for core exercises) */}
          {!isCore && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Weight (lbs)</label>
              <input
                type="number"
                value={safeExercise.weight}
                onChange={(e) => onUpdate(workoutId, safeExercise.id, 'weight', e.target.value)}
                placeholder="0"
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
          )}
        </div>

        {/* Notes Field */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</label>
          <textarea
            value={safeExercise.notes}
            onChange={(e) => onUpdate(workoutId, safeExercise.id, 'notes', e.target.value)}
            placeholder="Exercise notes..."
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm resize-none"
            rows="2"
          />
        </div>

        {/* Copy and Delete Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onCopy(workoutId, safeExercise)}
            className="flex-1 bg-white border border-slate-300 text-slate-700 py-1.5 px-3 rounded text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition"
          >
            <span aria-hidden style={{fontSize: 12}}>📄</span>
            Copy
          </button>
          <button
            onClick={() => onDelete(workoutId, safeExercise.id)}
            className="flex-1 bg-white border border-red-300 text-red-600 py-1.5 px-3 rounded text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-50 transition"
          >
            <span aria-hidden style={{fontSize: 12}}>🗑️</span>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}