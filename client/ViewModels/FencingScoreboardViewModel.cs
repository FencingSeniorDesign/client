using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using Avalonia.Threading;
using client.Commands; // if you keep RelayCommand there

namespace client.ViewModels
{
    public class FencingScoreboardViewModel : INotifyPropertyChanged
    {
        private int _scoreLeft;
        private int _scoreRight;
        private TimeSpan _timeLeft;
        private bool _isTimerRunning;
        private readonly DispatcherTimer _timer;

        public event PropertyChangedEventHandler PropertyChanged;

        // Scores
        public int ScoreLeft
        {
            get => _scoreLeft;
            set => SetField(ref _scoreLeft, value);
        }

        public int ScoreRight
        {
            get => _scoreRight;
            set => SetField(ref _scoreRight, value);
        }

        // Time left on the clock
        public TimeSpan TimeLeft
        {
            get => _timeLeft;
            set => SetField(ref _timeLeft, value);
        }

        // Label for the timer button, e.g. "Play" or "Pause"
        public string TimerButtonContent => _isTimerRunning ? "Pause" : "Play";

        // Commands
        public ICommand AddScoreLeftCommand { get; }
        public ICommand SubtractScoreLeftCommand { get; }
        public ICommand AddScoreRightCommand { get; }
        public ICommand SubtractScoreRightCommand { get; }
        public ICommand StartPauseTimerCommand { get; }
        public ICommand ResetTimerCommand { get; }

        public FencingScoreboardViewModel()
        {
            // Initialize scores
            ScoreLeft = 0;
            ScoreRight = 0;

            // Initialize time to 3:00
            TimeLeft = TimeSpan.FromMinutes(3);

            // Set up the timer (1-second intervals)
            _timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };
            _timer.Tick += OnTimerTick;

            // Define commands
            AddScoreLeftCommand = new RelayCommand(() =>
            {
                ScoreLeft++;
                PauseTimerIfRunning();
            });

            SubtractScoreLeftCommand = new RelayCommand(() =>
            {
                if (ScoreLeft > 0) ScoreLeft--;
                PauseTimerIfRunning();
            });

            AddScoreRightCommand = new RelayCommand(() =>
            {
                ScoreRight++;
                PauseTimerIfRunning();
            });

            SubtractScoreRightCommand = new RelayCommand(() =>
            {
                if (ScoreRight > 0) ScoreRight--;
                PauseTimerIfRunning();
            });

            StartPauseTimerCommand = new RelayCommand(() =>
            {
                if (_isTimerRunning)
                {
                    // Pause
                    _timer.Stop();
                    _isTimerRunning = false;
                    OnPropertyChanged(nameof(TimerButtonContent));
                }
                else
                {
                    // Start
                    _timer.Start();
                    _isTimerRunning = true;
                    OnPropertyChanged(nameof(TimerButtonContent));
                }
            });

            ResetTimerCommand = new RelayCommand(() =>
            {
                _timer.Stop();
                _isTimerRunning = false;
                TimeLeft = TimeSpan.FromMinutes(3);
                OnPropertyChanged(nameof(TimerButtonContent));
            });
        }

        private void OnTimerTick(object sender, EventArgs e)
        {
            // Decrement by 1 second each tick
            if (TimeLeft.TotalSeconds > 1)
            {
                TimeLeft = TimeLeft - TimeSpan.FromSeconds(1);
            }
            else
            {
                // Stop the timer if we run out of time
                TimeLeft = TimeSpan.Zero;
                _timer.Stop();
                _isTimerRunning = false;
                OnPropertyChanged(nameof(TimerButtonContent));
            }
        }

        private void PauseTimerIfRunning()
        {
            if (_isTimerRunning)
            {
                _timer.Stop();
                _isTimerRunning = false;
                OnPropertyChanged(nameof(TimerButtonContent));
            }
        }

        protected void OnPropertyChanged([CallerMemberName] string name = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
        }

        protected bool SetField<T>(ref T field, T value, [CallerMemberName] string name = null)
        {
            if (!Equals(field, value))
            {
                field = value;
                OnPropertyChanged(name);
                return true;
            }
            return false;
        }
    }
}
